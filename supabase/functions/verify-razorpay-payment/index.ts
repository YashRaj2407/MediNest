// Supabase Edge Function: verify-razorpay-payment
// Verifies Razorpay payment signature server-side, then saves the appointment.
// Deploy: supabase functions deploy verify-razorpay-payment --no-verify-jwt
// Secrets: RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { encodeHex } from 'https://deno.land/std@0.224.0/encoding/hex.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      appointment,          // full appointment payload from the frontend
    } = body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      appointment: Record<string, unknown>;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment identifiers' }, 400);
    }

    // ── HMAC-SHA256 Signature Verification ────────────────────────────────────
    // Razorpay computes: HMAC_SHA256(key_secret, order_id + "|" + payment_id)
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return json({ error: 'Payment gateway not configured' }, 503);
    }

    const message   = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder   = new TextEncoder();
    const keyBytes  = encoder.encode(keySecret);
    const msgBytes  = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
    const computedSignature = encodeHex(new Uint8Array(signatureBytes));

    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(computedSignature, razorpay_signature)) {
      return json({ error: 'Payment verification failed. Invalid signature.' }, 400);
    }
    // ── Signature is valid ─────────────────────────────────────────────────────

    const supabaseUrl    = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseSecret) {
      return json({ error: 'Database not configured' }, 503);
    }

    const db = createClient(supabaseUrl, supabaseSecret);

    // 1. Confirm the slot hold (marks slot as permanently booked)
    await db
      .from('slot_holds')
      .update({ confirmed: true })
      .eq('order_id', razorpay_order_id);

    // 2. Insert the appointment record
    const apptId = appointment.id as string;
    const { data: apptData, error: apptErr } = await db
      .from('appointments')
      .insert({
        id:                  apptId,
        patient_id:          appointment.patient_id ?? null,
        doctor_id:           appointment.doctor_id,
        consultation_type:   appointment.consultation_type,
        start_datetime:      appointment.start_datetime,
        end_datetime:        appointment.end_datetime,
        symptoms:            appointment.symptoms ?? 'Routine consultation',
        status:              'upcoming',
        payment_status:      'paid',
        total_inr:           appointment.total_inr,
        fee_inr:             appointment.fee_inr,
        platform_fee_inr:    appointment.platform_fee_inr ?? 0,
        taxes_inr:           appointment.taxes_inr ?? 0,
        patient_name:        appointment.patient_name,
        patient_age:         appointment.patient_age,
        patient_gender:      appointment.patient_gender,
        patient_phone:       appointment.patient_phone,
        patient_email:       appointment.patient_email,
        video_link:          appointment.video_link ?? null,
        razorpay_order_id,
        razorpay_payment_id,
      })
      .select()
      .single();

    if (apptErr) {
      // Non-fatal if appointment row already exists (idempotent retry)
      if (apptErr.code !== '23505') {
        console.error('[verify] appointment insert error:', apptErr.code);
      }
    }

    // 3. Insert payment record
    await db.from('payments').insert({
      appointment_id:      apptData?.id ?? apptId,
      payment_method:      appointment.payment_method ?? 'Razorpay',
      amount_inr:          appointment.total_inr,
      status:              'paid',
      razorpay_order_id,
      razorpay_payment_id,
      paid_at:             new Date().toISOString(),
    });

    return json({
      success: true,
      appointment_id: apptData?.id ?? apptId,
      razorpay_payment_id,
    });

  } catch (err) {
    return json({ error: (err as Error).message ?? 'Internal error' }, 500);
  }
});

/** Constant-time string comparison — prevents timing-based signature forgery */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
