import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `You are MediNest AI, a helpful, empathetic, and professional clinical healthcare assistant for the MediNest appointment booking platform in India.
Your mission is to help patients understand their symptoms, provide safe health education, and guide them to the appropriate medical specialist (General Physician, Dermatologist, Cardiologist, Gynecologist, Orthopedic, ENT Specialist, Pediatrician, Psychiatrist, Dentist, etc.) for appointment booking.

IMPORTANT CLINICAL SAFETY GUIDELINES:
1. Always state that this guidance is informational and does not replace a direct physical clinical consultation.
2. If the user mentions emergency signs (e.g. crushing chest pain, sudden numbness/paralysis, severe shortness of breath, coughing blood, seizure), immediately advise them to seek emergency care (Dial 112 / 108 in India).
3. Suggest appropriate lifestyle/home comfort tips where safe (hydration, rest).
4. Recommend the specific doctor specialty on MediNest they should consult.
5. Keep responses concise, warm, structured, and easy to read.`;

/**
 * Fallback Clinical Rules Engine when Gemini API key is missing or encounters rate limits.
 */
function generateRulesBasedResponse(userMessage) {
  const text = (userMessage || '').toLowerCase();

  // 1. Emergency Check
  const emergencyKeywords = [
    'heart attack', 'crushing chest pain', 'cannot breathe', 'breathless',
    'stroke', 'paralysis', 'unconscious', 'coughing blood', 'seizure', 'severe trauma'
  ];
  if (emergencyKeywords.some(k => text.includes(k))) {
    return {
      content: `⚠️ **URGENT MEDICAL ALERT**: Your symptoms may indicate an acute medical emergency. Please do not wait for an online consultation.\n\n• Call **112** or **108** immediately for ambulance assistance.\n• Proceed to the nearest hospital Emergency Room immediately.\n\nIf you have a trusted companion with you, notify them right away.`,
      metadata: {
        urgency: 'emergency',
        suggestedSpecialty: 'Cardiologist / Emergency Medicine',
        specialtyId: 'cardiologist',
        model: 'clinical-rules-engine'
      }
    };
  }

  // 2. Specialty Matching
  let specialty = 'General Physician';
  let specialtyId = 'general-physician';
  let urgency = 'routine';
  let advice = '';

  if (text.match(/skin|rash|acne|pimple|itching|hair|eczema|fungal|allergy|scab|pigment/)) {
    specialty = 'Dermatologist';
    specialtyId = 'dermatologist';
    advice = 'Avoid scratching the affected area, use mild fragrance-free soaps, and keep the skin well-hydrated.';
  } else if (text.match(/chest|heart|bp|blood pressure|palpitation|pulse|hypertension/)) {
    specialty = 'Cardiologist';
    specialtyId = 'cardiologist';
    urgency = 'soon';
    advice = 'Avoid strenuous exertion, limit caffeine/sodium, and monitor your blood pressure if you have a home monitor.';
  } else if (text.match(/bone|joint|knee|back|spine|shoulder|fracture|arthritis|ligament|sprain|neck/)) {
    specialty = 'Orthopedic Specialist';
    specialtyId = 'orthopedic';
    advice = 'Try resting the affected joint, apply gentle ice or warm compress, and avoid heavy weight lifting.';
  } else if (text.match(/period|cramp|pcos|pcod|pregnant|pregnancy|vaginal|menstrual|gynec/)) {
    specialty = 'Gynecologist';
    specialtyId = 'gynecologist';
    advice = 'Maintain a symptom tracker of your cycle dates and stay hydrated with warm fluids.';
  } else if (text.match(/tooth|teeth|gum|cavity|decay|bleeding gum|dental/)) {
    specialty = 'Dentist';
    specialtyId = 'dentist';
    advice = 'Rinse with warm salt water and avoid very hot or cold beverages until evaluated.';
  } else if (text.match(/ear|nose|throat|tonsil|sinus|hearing|voice|cold|cough/)) {
    specialty = 'ENT Specialist';
    specialtyId = 'ent';
    advice = 'Perform warm saline gargles twice daily, steam inhalation, and drink warm water.';
  } else if (text.match(/anxiety|stress|panic|depression|sleep|insomnia|mental/)) {
    specialty = 'Psychiatrist / Mental Health Specialist';
    specialtyId = 'psychiatrist';
    advice = 'Practice slow 4-7-8 breathing exercises, maintain consistent sleep routines, and know you are not alone.';
  } else if (text.match(/child|baby|infant|kid|toddler|pediatric/)) {
    specialty = 'Pediatrician';
    specialtyId = 'pediatrician';
    urgency = 'soon';
    advice = 'Keep the child well-hydrated, monitor temperature with a thermometer, and note feeding patterns.';
  } else {
    advice = 'Ensure adequate rest, drink plenty of fluids, and keep a log of when the symptoms started.';
  }

  const content = `Hello! Based on what you described, here is clinical guidance from MediNest:

**Preliminary Observations**:
${advice}

**Recommended Doctor Specialty**:
We recommend consulting a verified **${specialty}** on MediNest for an official evaluation. You can book an in-clinic or video consultation right from our Doctors section.

*Medical Disclaimer: This guidance is provided for general health information and does not constitute a formal diagnosis or prescription.*`;

  return {
    content,
    metadata: {
      urgency,
      suggestedSpecialty: specialty,
      specialtyId,
      model: 'clinical-rules-engine'
    }
  };
}

/**
 * Extracts or infers appropriate medical specialty from combined user message and AI response.
 */
function detectSpecialty(userMessage, replyText) {
  const combined = `${userMessage || ''} ${replyText || ''}`.toLowerCase();
  if (combined.match(/dermatolog|skin|rash|acne|itching|eczema/)) return { specialty: 'Dermatologist', id: 'dermatologist' };
  if (combined.match(/cardiolog|heart|chest pain|palpitation|blood pressure|hypertension/)) return { specialty: 'Cardiologist', id: 'cardiologist' };
  if (combined.match(/orthopedic|bone|joint|knee|back|spine|shoulder|fracture/)) return { specialty: 'Orthopedic Specialist', id: 'orthopedic' };
  if (combined.match(/gynecolog|period|cramp|pcos|pcod|pregnant|pregnancy/)) return { specialty: 'Gynecologist', id: 'gynecologist' };
  if (combined.match(/dentist|dental|tooth|teeth|gum|cavity/)) return { specialty: 'Dentist', id: 'dentist' };
  if (combined.match(/ent specialist|ear|nose|throat|tonsil|sinus/)) return { specialty: 'ENT Specialist', id: 'ent' };
  if (combined.match(/psychiatrist|mental health|anxiety|depression|sleep/)) return { specialty: 'Psychiatrist / Mental Health Specialist', id: 'psychiatrist' };
  if (combined.match(/pediatric|child|infant|kid|baby/)) return { specialty: 'Pediatrician', id: 'pediatrician' };
  return { specialty: 'General Physician', id: 'general-physician' };
}

/**
 * Generates an AI chatbot response given the message history.
 */
export async function generateChatbotResponse(messages = [], options = {}) {
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
    return generateRulesBasedResponse(lastUserMessage);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Construct conversation context for Gemini
    const contents = [];
    contents.push({
      role: 'user',
      parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nPlease review this consultation history and provide your medical assistant response.` }]
    });

    // Add recent conversation history (up to last 10 turns)
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents
    });

    const replyText = response.text || '';
    if (!replyText.trim()) {
      return generateRulesBasedResponse(lastUserMessage);
    }

    const spec = detectSpecialty(lastUserMessage, replyText);

    return {
      content: replyText,
      metadata: {
        model: 'gemini-2.5-flash',
        suggestedSpecialty: spec.specialty,
        specialtyId: spec.id,
        timestamp: new Date().toISOString()
      }
    };
  } catch (err) {
    console.warn('[Gemini AI Service] Falling back to Clinical Rules Engine:', err.message);
    return generateRulesBasedResponse(lastUserMessage);
  }
}

export default {
  generateChatbotResponse,
};
