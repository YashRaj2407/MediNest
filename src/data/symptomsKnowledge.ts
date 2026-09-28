export interface SymptomTag {
  id: string;
  name: string;
  category: 'General' | 'Skin & Hair' | 'Women’s Health' | 'Bones & Joints' | 'Head & Mind' | 'Dental' | 'Chest & Heart' | 'ENT';
  suggestedSpecialty: string;
  specialtyId: string;
}

export const COMMON_SYMPTOM_TAGS: SymptomTag[] = [
  { id: 'fever', name: 'Fever & Chills', category: 'General', suggestedSpecialty: 'General Physician', specialtyId: 'general-physician' },
  { id: 'cough', name: 'Persistent Cough / Cold', category: 'General', suggestedSpecialty: 'General Physician', specialtyId: 'general-physician' },
  { id: 'fatigue', name: 'Extreme Fatigue & Weakness', category: 'General', suggestedSpecialty: 'General Physician', specialtyId: 'general-physician' },
  { id: 'stomach-pain', name: 'Stomach Ache / Acidity', category: 'General', suggestedSpecialty: 'General Physician', specialtyId: 'general-physician' },
  
  { id: 'skin-rash', name: 'Skin Rash & Itching', category: 'Skin & Hair', suggestedSpecialty: 'Dermatologist', specialtyId: 'dermatologist' },
  { id: 'acne', name: 'Severe Acne & Pimples', category: 'Skin & Hair', suggestedSpecialty: 'Dermatologist', specialtyId: 'dermatologist' },
  { id: 'hair-fall', name: 'Excessive Hair Fall', category: 'Skin & Hair', suggestedSpecialty: 'Dermatologist', specialtyId: 'dermatologist' },
  
  { id: 'back-pain', name: 'Lower Back Pain', category: 'Bones & Joints', suggestedSpecialty: 'Orthopedic', specialtyId: 'orthopedic' },
  { id: 'knee-pain', name: 'Knee & Joint Swelling', category: 'Bones & Joints', suggestedSpecialty: 'Orthopedic', specialtyId: 'orthopedic' },
  { id: 'neck-pain', name: 'Neck Stiffness & Spondylosis', category: 'Bones & Joints', suggestedSpecialty: 'Orthopedic', specialtyId: 'orthopedic' },
  
  { id: 'tooth-pain', name: 'Severe Toothache', category: 'Dental', suggestedSpecialty: 'Dentist', specialtyId: 'dentist' },
  { id: 'bleeding-gums', name: 'Bleeding Gums & Sensitivity', category: 'Dental', suggestedSpecialty: 'Dentist', specialtyId: 'dentist' },
  
  { id: 'anxiety', name: 'Anxiety & Panic Feelings', category: 'Head & Mind', suggestedSpecialty: 'Psychiatrist', specialtyId: 'psychiatrist' },
  { id: 'insomnia', name: 'Sleep Trouble / Insomnia', category: 'Head & Mind', suggestedSpecialty: 'Psychiatrist', specialtyId: 'psychiatrist' },
  { id: 'depression', name: 'Persistent Low Mood', category: 'Head & Mind', suggestedSpecialty: 'Psychiatrist', specialtyId: 'psychiatrist' },
  
  { id: 'irregular-periods', name: 'Irregular Periods / Cramps', category: 'Women’s Health', suggestedSpecialty: 'Gynecologist', specialtyId: 'gynecologist' },
  { id: 'pcos', name: 'PCOS / PCOD Concerns', category: 'Women’s Health', suggestedSpecialty: 'Gynecologist', specialtyId: 'gynecologist' },
  
  { id: 'chest-discomfort', name: 'Chest Tightness / High BP', category: 'Chest & Heart', suggestedSpecialty: 'Cardiologist', specialtyId: 'cardiologist' },
  { id: 'palpitations', name: 'Rapid Heartbeats / Palpitations', category: 'Chest & Heart', suggestedSpecialty: 'Cardiologist', specialtyId: 'cardiologist' },
  
  { id: 'sore-throat', name: 'Sore Throat & Tonsil Pain', category: 'ENT', suggestedSpecialty: 'ENT Specialist', specialtyId: 'ent' },
  { id: 'ear-pain', name: 'Earache & Blocked Ear', category: 'ENT', suggestedSpecialty: 'ENT Specialist', specialtyId: 'ent' },
  { id: 'sinusitis', name: 'Sinus Congestion & Headache', category: 'ENT', suggestedSpecialty: 'ENT Specialist', specialtyId: 'ent' },
  
  { id: 'blurry-vision', name: 'Blurry Vision & Eye Strain', category: 'Head & Mind', suggestedSpecialty: 'Ophthalmologist', specialtyId: 'ophthalmologist' }
];

export function analyzeSymptomsEngine(
  symptomsList: string[],
  userDescription: string,
  severity: 'mild' | 'moderate' | 'severe'
) {
  const allText = `${symptomsList.join(' ')} ${userDescription}`.toLowerCase();

  // Check emergency keywords
  const emergencyKeywords = [
    'crushing chest pain',
    'chest pain radiating',
    'heart attack',
    'cannot breathe',
    'severe breathlessness',
    'unconscious',
    'coughing blood',
    'slurred speech',
    'sudden paralysis',
    'seizure'
  ];

  const hasEmergency = emergencyKeywords.some(k => allText.includes(k));
  if (hasEmergency || (allText.includes('chest') && severity === 'severe')) {
    return {
      primarySpecialty: 'Cardiologist',
      specialtyId: 'cardiologist',
      urgency: 'emergency' as const,
      summary: 'Emergency Warning: Severe cardiopulmonary symptoms detected. Immediate emergency medical attention or ambulance is required.',
      possibleCauses: ['Acute Angina or Cardiac Event', 'Severe Respiratory Distress', 'Hypertensive Crisis'],
      disclaimer: 'This is not a medical diagnosis. For emergencies, contact local emergency services immediately (Call 112 / 108 in India).'
    };
  }

  // Scoring specialties based on matches
  const scores: Record<string, { count: number; name: string; id: string }> = {
    'dermatologist': { count: 0, name: 'Dermatologist', id: 'dermatologist' },
    'cardiologist': { count: 0, name: 'Cardiologist', id: 'cardiologist' },
    'orthopedic': { count: 0, name: 'Orthopedic', id: 'orthopedic' },
    'dentist': { count: 0, name: 'Dentist', id: 'dentist' },
    'gynecologist': { count: 0, name: 'Gynecologist', id: 'gynecologist' },
    'psychiatrist': { count: 0, name: 'Psychiatrist', id: 'psychiatrist' },
    'ent': { count: 0, name: 'ENT Specialist', id: 'ent' },
    'ophthalmologist': { count: 0, name: 'Ophthalmologist', id: 'ophthalmologist' },
    'pediatrician': { count: 0, name: 'Pediatrician', id: 'pediatrician' },
    'general-physician': { count: 1, name: 'General Physician', id: 'general-physician' } // baseline
  };

  // Dermatology
  if (allText.match(/skin|rash|acne|pimple|itch|hair|alopecia|eczema|fungal|allergy|scab|pigment/)) {
    scores['dermatologist'].count += 4;
  }
  // Cardiology
  if (allText.match(/chest|heart|bp|blood pressure|palpitation|pulse|angina|hypertension/)) {
    scores['cardiologist'].count += 4;
  }
  // Orthopedic
  if (allText.match(/bone|joint|knee|back|spine|shoulder|fracture|arthritis|ligament|sprain|neck/)) {
    scores['orthopedic'].count += 4;
  }
  // Dentist
  if (allText.match(/tooth|teeth|gum|molar|cavity|dent|wisdom tooth|oral|jaw/)) {
    scores['dentist'].count += 5;
  }
  // Gynecologist
  if (allText.match(/period|menstrual|pcos|pcod|pregnant|pregnancy|ovary|cramp|uterus|vaginal/)) {
    scores['gynecologist'].count += 5;
  }
  // Psychiatrist
  if (allText.match(/anxiety|panic|depress|mental|sleep|insomnia|stress|mood|adhd|bipolar/)) {
    scores['psychiatrist'].count += 4;
  }
  // ENT
  if (allText.match(/ear|hearing|nose|throat|tonsil|sinus|vertigo|tinnitus|nasal/)) {
    scores['ent'].count += 4;
  }
  // Ophthalmology
  if (allText.match(/eye|vision|sight|blur|glaucoma|cataract|cornea|spectacles/)) {
    scores['ophthalmologist'].count += 5;
  }
  // Pediatrician
  if (allText.match(/baby|child|infant|toddler|kid|pediatric|vaccination/)) {
    scores['pediatrician'].count += 5;
  }
  // General Physician
  if (allText.match(/fever|flu|cold|cough|vomit|diarrhea|stomach|headache|weak|tired|chills|dengue|infection/)) {
    scores['general-physician'].count += 3;
  }

  // Find top specialty
  const sorted = Object.values(scores).sort((a, b) => b.count - a.count);
  const best = sorted[0];

  const urgency = severity === 'severe' ? 'soon' : 'routine';

  let possibleCauses: string[] = ['Underlying clinical condition requiring targeted assessment'];
  if (best.id === 'dermatologist') {
    possibleCauses = ['Contact Dermatitis or Allergic Flare', 'Acne Vulgaris', 'Seborrheic Scalp Condition', 'Eczematous Patch'];
  } else if (best.id === 'orthopedic') {
    possibleCauses = ['Lumbar / Cervical Muscle Strain', 'Early Osteoarthritis', 'Postural Spondylosis', 'Ligament Tendinitis'];
  } else if (best.id === 'dentist') {
    possibleCauses = ['Dental Caries / Pulpitis', 'Gingivitis or Gum Sensitivity', 'Impacted Wisdom Molar'];
  } else if (best.id === 'general-physician') {
    possibleCauses = ['Viral Upper Respiratory Infection', 'Seasonal Influenza', 'Acute Gastritis / Acidity', 'Systemic Fatigue'];
  } else if (best.id === 'cardiologist') {
    possibleCauses = ['Stage-1 Hypertension', 'Stress-Induced Palpitations', 'Atypical Chest Discomfort'];
  } else if (best.id === 'psychiatrist') {
    possibleCauses = ['Generalized Anxiety Episodes', 'Circadian Sleep Cycle Disturbance', 'Chronic Work Stress / Burnout'];
  } else if (best.id === 'gynecologist') {
    possibleCauses = ['Polycystic Ovarian Syndrome (PCOS)', 'Hormonal Dysregulation', 'Dysmenorrhea'];
  } else if (best.id === 'ent') {
    possibleCauses = ['Acute Allergic Rhinitis', 'Sinus Ostial Congestion', 'Otitis Media or Eustachian Tube Block'];
  } else if (best.id === 'ophthalmologist') {
    possibleCauses = ['Digital Asthenopia / Eye Strain', 'Tear Film Deficiency / Dry Eyes', 'Refractive Error'];
  }

  return {
    primarySpecialty: best.name,
    specialtyId: best.id,
    urgency,
    summary: `Based on your stated symptoms (${symptomsList.slice(0, 3).join(', ') || 'reported concerns'}), consulting a verified ${best.name} is strongly indicated for proper clinical review.`,
    possibleCauses,
    disclaimer: 'This is not a medical diagnosis. For emergencies, contact local emergency services immediately.'
  };
}
