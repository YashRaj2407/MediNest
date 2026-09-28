import { Specialty } from '../types';

export const SPECIALTIES: Specialty[] = [
  {
    id: 'general-physician',
    name: 'General Physician',
    iconName: 'Stethoscope',
    description: 'Diagnosis and non-surgical treatment of adult diseases, seasonal fevers, infections and chronic conditions.',
    startingFeeINR: 499,
    doctorCount: 48,
    commonSymptoms: ['Fever', 'Fatigue', 'Cold & Cough', 'Body Ache', 'Weakness', 'Headache']
  },
  {
    id: 'dermatologist',
    name: 'Dermatologist',
    iconName: 'Sparkles',
    description: 'Expert skin, hair, and nail treatments, acne control, pigmentation, rashes, and allergy management.',
    startingFeeINR: 699,
    doctorCount: 32,
    commonSymptoms: ['Acne', 'Skin Rash', 'Hair Fall', 'Eczema', 'Itching', 'Psoriasis']
  },
  {
    id: 'gynecologist',
    name: 'Gynecologist',
    iconName: 'HeartPulse',
    description: "Women's reproductive health, menstrual irregularities, PCOS/PCOD, pregnancy care and pelvic wellness.",
    startingFeeINR: 799,
    doctorCount: 29,
    commonSymptoms: ['Irregular Periods', 'PCOS / PCOD', 'Pelvic Pain', 'Pregnancy Care', 'Hormonal Imbalance']
  },
  {
    id: 'pediatrician',
    name: 'Pediatrician',
    iconName: 'Baby',
    description: 'Comprehensive medical care for infants, children and adolescents, vaccinations and developmental growth.',
    startingFeeINR: 599,
    doctorCount: 36,
    commonSymptoms: ['Child Fever', 'Vaccination', 'Infant Colic', 'Growth Milestones', 'Child Cough']
  },
  {
    id: 'dentist',
    name: 'Dentist',
    iconName: 'Smile',
    description: 'Oral health, dental cleanings, root canals, toothache relief, braces, aligners and restorative dental care.',
    startingFeeINR: 499,
    doctorCount: 41,
    commonSymptoms: ['Toothache', 'Bleeding Gums', 'Cavities', 'Wisdom Tooth Pain', 'Bad Breath']
  },
  {
    id: 'orthopedic',
    name: 'Orthopedic',
    iconName: 'Bone',
    description: 'Musculoskeletal system care, joints, bones, fractures, sports injuries, arthritis and chronic back pain.',
    startingFeeINR: 799,
    doctorCount: 27,
    commonSymptoms: ['Joint Pain', 'Knee Stiffness', 'Back Pain', 'Fractures', 'Arthritis', 'Neck Pain']
  },
  {
    id: 'cardiologist',
    name: 'Cardiologist',
    iconName: 'Heart',
    description: 'Heart health, coronary disease management, hypertension, cholesterol control and ECG evaluations.',
    startingFeeINR: 1200,
    doctorCount: 19,
    commonSymptoms: ['Chest Discomfort', 'High Blood Pressure', 'Palpitations', 'Shortness of Breath']
  },
  {
    id: 'ent',
    name: 'ENT Specialist',
    iconName: 'Headphones',
    description: 'Ear, nose, throat and sinus disorders, hearing loss, vertigo, tonsillitis and nasal allergy issues.',
    startingFeeINR: 599,
    doctorCount: 24,
    commonSymptoms: ['Earache', 'Sinusitis', 'Sore Throat', 'Hearing Loss', 'Nasal Congestion', 'Vertigo']
  },
  {
    id: 'psychiatrist',
    name: 'Psychiatrist',
    iconName: 'Brain',
    description: 'Mental and emotional well-being, anxiety management, depression therapies, ADHD and sleep disorders.',
    startingFeeINR: 999,
    doctorCount: 21,
    commonSymptoms: ['Anxiety', 'Depression', 'Sleep Insomnia', 'Panic Attacks', 'Extreme Stress']
  },
  {
    id: 'ophthalmologist',
    name: 'Ophthalmologist',
    iconName: 'Eye',
    description: 'Comprehensive eye care, cataract evaluation, vision checkups, glaucoma screening and laser eye surgery.',
    startingFeeINR: 599,
    doctorCount: 22,
    commonSymptoms: ['Blurry Vision', 'Eye Strain', 'Red Eyes', 'Dry Eyes', 'Cataract Check']
  }
];

export const INDIAN_CITIES = [
  'All Cities',
  'Bengaluru',
  'Delhi NCR',
  'Mumbai',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Chandigarh'
];
