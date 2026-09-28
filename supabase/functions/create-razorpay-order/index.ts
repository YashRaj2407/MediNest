// Supabase Edge Function: create-razorpay-order
// Runs server-side on Deno — KEY_SECRET never reaches the browser.
// Deploy: supabase functions deploy create-razorpay-order --no-verify-jwt
// Secrets: supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=rzp_test_xxx

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { amount_inr, appointment_ref, doctor_id, slot_datetime } = body as {
      amount_inr: number;
      appointment_ref: string;
      doctor_id?: string;
      slot_datetime?: string;
    };

    if (!amount_inr || amount_inr <= 0) {
      return json({ error: 'Invalid amount' }, 400);
    }
    if (!appointment_ref) {
      return json({ error: 'appointment_ref is required' }, 400);
    }

    // Read secrets from Deno environment — never from client
    const keyId     = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return json({ error: 'Payment gateway not configured' }, 503);
    }

    // Create Razorpay order via their REST API using Basic auth (key_id:key_secret)
    const credentials = btoa(`${keyId}:${keySecret}`);
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount_inr * 100), // Razorpay uses paise (1 INR = 100 paise)
        currency: 'INR',
        receipt: appointment_ref.substring(0, 40), // Razorpay receipt max 40 chars
        notes: { appointment_ref },
        payment_capture: 1, // auto-capture on success
      }),
    });

    const order = await rzpRes.json();

    if (!rzpRes.ok) {
      const desc = order?.error?.description || 'Razorpay order creation failed';
      return json({ error: desc }, 502);
    }

    // Optimistic slot hold — blocks this slot for 10 minutes while the user pays
    if (doctor_id && slot_datetime) {
      try {
        const supabaseUrl    = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        if (supabaseUrl && supabaseSecret) {
          const db = createClient(supabaseUrl, supabaseSecret);
          await db.from('slot_holds').upsert({
            doctor_id,
            slot_datetime,
            order_id: order.id,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            confirmed: false,
          }, { onConflict: 'order_id' });
        }
      } catch (_e) {
        // Non-fatal: slot hold failure shouldn't block payment creation
      }
    }

    // Return only the public key_id — NEVER return key_secret
    return json({ order_id: order.id, key_id: keyId, amount: order.amount });

  } catch (err) {
    return json({ error: (err as Error).message ?? 'Internal error' }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
