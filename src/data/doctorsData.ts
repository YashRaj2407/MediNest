import { Doctor } from '../types';

export const INITIAL_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Ananya Sharma',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600',
    specialty: 'Dermatologist',
    specialtyId: 'dermatologist',
    qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy)',
    experienceYears: 11,
    clinicName: 'Aura Skin & Hair Clinic (Affiliated with Max Healthcare)',
    address: 'B-14, Ground Floor, Greater Kailash 1, New Delhi - 110048',
    city: 'Delhi NCR',
    languages: ['English', 'Hindi', 'Punjabi'],
    rating: 4.9,
    reviewCount: 382,
    nextAvailableSlot: 'Today, 04:30 PM',
    feeINR: 799,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Ananya Sharma is a board-certified dermatologist with over 11 years of experience specializing in clinical dermatology, stubborn acne treatments, eczema, chemical peels, and hair-loss therapies. She completed her post-graduation from Maulana Azad Medical College, New Delhi.',
    registrationNumber: 'DMC-2013-58421',
    availableToday: true,
    services: [
      { name: 'General Skin Consultation', feeINR: 799 },
      { name: 'Acne & Scarring Assessment', feeINR: 999 },
      { name: 'Hair Loss & Scalp Trichoscopy', feeINR: 1200 },
      { name: 'Allergy Patch Test Evaluation', feeINR: 1500 }
    ],
    reviews: [
      {
        id: 'rev-1',
        author: 'Pooja Verma',
        city: 'New Delhi',
        rating: 5,
        date: '2 days ago',
        comment: 'Dr. Ananya listened so patiently to my cystic acne issues. The prescription worked wonders in just 3 weeks without unnecessary costly procedures.',
        verified: true
      },
      {
        id: 'rev-2',
        author: 'Ramanjot Singh',
        city: 'Gurugram',
        rating: 5,
        date: '1 week ago',
        comment: 'Very professional clinic setup and seamless digital prescription. The video follow-up was right on time.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-2',
    name: 'Dr. Arjun Mehta',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
    specialty: 'Cardiologist',
    specialtyId: 'cardiologist',
    qualifications: 'MBBS, MD (Medicine), DM (Cardiology), FACC',
    experienceYears: 16,
    clinicName: 'Apollo Hospitals Cardiac Centre',
    address: '154/11, Bannerghatta Road, Opp. IIM-B, Bengaluru - 560076',
    city: 'Bengaluru',
    languages: ['English', 'Hindi', 'Kannada', 'Gujarati'],
    rating: 4.9,
    reviewCount: 512,
    nextAvailableSlot: 'Today, 05:45 PM',
    feeINR: 1200,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Arjun Mehta is a Senior Interventional Cardiologist with 16+ years of clinical excellence. Trained at AIIMS New Delhi and fellowship trained at Mount Sinai, he has managed complex coronary angiographies, hypertension protocols, and preventative lifestyle cardiology for thousands of cardiac patients.',
    registrationNumber: 'KMC-2008-39210',
    availableToday: true,
    services: [
      { name: 'Comprehensive Heart Evaluation', feeINR: 1200 },
      { name: 'Hypertension Management Consultation', feeINR: 1000 },
      { name: 'ECG & Holter Report Interpretation', feeINR: 1400 },
      { name: 'Post-Angioplasty Follow-up', feeINR: 1200 }
    ],
    reviews: [
      {
        id: 'rev-3',
        author: 'Suresh Narayanan',
        city: 'Bengaluru',
        rating: 5,
        date: '3 days ago',
        comment: 'Dr. Mehta prevented an unnecessary stent proposed elsewhere. He took his time explaining my stress test results and adjusted my medication.',
        verified: true
      },
      {
        id: 'rev-4',
        author: 'Deepa Hegde',
        city: 'Bengaluru',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Extremely reassuring demeanour. The clinic staff at Apollo Bannerghatta was also very courteous.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-3',
    name: 'Dr. Kavya Iyer',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1594824813576-a4c330df30b3?auto=format&fit=crop&q=80&w=600',
    specialty: 'Gynecologist',
    specialtyId: 'gynecologist',
    qualifications: 'MBBS, MS (Obstetrics & Gynaecology), DNB, MRCOG (UK)',
    experienceYears: 13,
    clinicName: 'Motherhood Women & Child Hospital',
    address: 'Plot 4, Sarjapur Main Road, Bellandur, Bengaluru - 560103',
    city: 'Bengaluru',
    languages: ['English', 'Tamil', 'Kannada', 'Hindi'],
    rating: 4.8,
    reviewCount: 428,
    nextAvailableSlot: 'Tomorrow, 10:00 AM',
    feeINR: 899,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Kavya Iyer is an obstetrician and gynaecologist specializing in high-risk pregnancies, PCOS/PCOD hormonal reversals, adolescent reproductive health, and laparoscopic minimally invasive surgery. She is an active fellow of the Royal College of Obstetricians and Gynaecologists.',
    registrationNumber: 'TMC-2011-47109',
    availableToday: false,
    services: [
      { name: 'Gynaecological Consultation', feeINR: 899 },
      { name: 'PCOS & Hormonal Health Protocol', feeINR: 1100 },
      { name: 'Antenatal & Trimester Guidance', feeINR: 1200 },
      { name: 'Pre-conception Screening Advice', feeINR: 999 }
    ],
    reviews: [
      {
        id: 'rev-5',
        author: 'Ananya Deshpande',
        city: 'Bengaluru',
        rating: 5,
        date: '5 days ago',
        comment: 'Dr. Kavya is wonderful! She answered every question about my first pregnancy patiently and made me feel completely at ease.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-4',
    name: 'Dr. Rohan Gupta',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600',
    specialty: 'General Physician',
    specialtyId: 'general-physician',
    qualifications: 'MBBS, MD (General Medicine)',
    experienceYears: 9,
    clinicName: 'MediNest Clinic',
    address: 'Indiranagar 100ft Road, Bengaluru - 560038',
    city: 'Bengaluru',
    languages: ['English', 'Hindi', 'Kannada'],
    rating: 4.8,
    reviewCount: 310,
    nextAvailableSlot: 'Today, 08:00 AM',
    feeINR: 499,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Rohan Gupta provides primary care, treatment for seasonal flu, viral fever, dengue/malaria diagnostics, diabetic sugar management, and digestive complaints. Known for avoiding polypharmacy and focusing on evidence-based treatment plans.',
    registrationNumber: 'MMC-2015-88241',
    availableToday: true,
    services: [
      { name: 'General Physician Consultation', feeINR: 499 },
      { name: 'Viral Fever & Infection Check', feeINR: 499 },
      { name: 'Diabetes & Thyroid Management', feeINR: 750 },
      { name: 'Annual Preventive Health Review', feeINR: 899 }
    ],
    reviews: [
      {
        id: 'rev-6',
        author: 'Amit Khandelwal',
        city: 'Mumbai',
        rating: 5,
        date: 'Yesterday',
        comment: 'Booked a video appointment when I had high fever. Doctor came online in 2 minutes, gave an exact lab test list and safe medicines. Relieved within 2 days.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-5',
    name: 'Dr. Priya Nambiar',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=600',
    specialty: 'Pediatrician',
    specialtyId: 'pediatrician',
    qualifications: 'MBBS, DCH, MD (Pediatrics), IAP Fellow',
    experienceYears: 14,
    clinicName: 'Rainbow Children’s Clinic & Vaccine Care',
    address: 'Road No. 2, Banjara Hills, Hyderabad - 500034',
    city: 'Hyderabad',
    languages: ['English', 'Telugu', 'Hindi', 'Malayalam'],
    rating: 4.9,
    reviewCount: 460,
    nextAvailableSlot: 'Today, 06:15 PM',
    feeINR: 699,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Priya Nambiar is a beloved child specialist known for her gentle demeanor with young infants and toddlers. She specializes in newborn care, childhood respiratory allergies, developmental milestones, and pediatric nutrition guidance.',
    registrationNumber: 'APMC-2010-19482',
    availableToday: true,
    services: [
      { name: 'Child Wellness Consultation', feeINR: 699 },
      { name: 'Immunization / Vaccination Counseling', feeINR: 599 },
      { name: 'Pediatric Allergy & Asthma Check', feeINR: 899 },
      { name: 'Newborn Growth Milestone Assessment', feeINR: 999 }
    ],
    reviews: [
      {
        id: 'rev-7',
        author: 'Karthik Rao',
        city: 'Hyderabad',
        rating: 5,
        date: '4 days ago',
        comment: 'Our baby was having severe colic. Dr. Priya diagnosed the milk sensitivity immediately. She is exceptionally warm and caring.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-6',
    name: 'Dr. Rajesh Singhal',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600',
    specialty: 'Orthopedic',
    specialtyId: 'orthopedic',
    qualifications: 'MBBS, MS (Orthopaedics), MCh (Joint Replacement)',
    experienceYears: 18,
    clinicName: 'Medanta Bone & Joint Care',
    address: 'CH Bakhtawar Singh Road, Sector 38, Gurugram, Delhi NCR - 122001',
    city: 'Delhi NCR',
    languages: ['English', 'Hindi'],
    rating: 4.9,
    reviewCount: 590,
    nextAvailableSlot: 'Tomorrow, 11:30 AM',
    feeINR: 1100,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Rajesh Singhal is a renowned orthopedic surgeon specializing in knee arthritis, degenerative disc back pain, shoulder arthroscopy, and sports trauma rehabilitation. He has performed over 3,000 successful joint procedures.',
    registrationNumber: 'DMC-2006-28104',
    availableToday: false,
    services: [
      { name: 'Orthopedic & Joint Consultation', feeINR: 1100 },
      { name: 'Spine & Back Pain Evaluation', feeINR: 1200 },
      { name: 'Arthritis & Knee Mobility Therapy', feeINR: 1300 },
      { name: 'Post-Surgical Rehab Assessment', feeINR: 1000 }
    ],
    reviews: [
      {
        id: 'rev-8',
        author: 'Manish Chawla',
        city: 'Gurugram',
        rating: 5,
        date: '1 week ago',
        comment: 'Dr. Singhal gave an honest assessment of my mother’s knee pain. He suggested targeted physiotherapy instead of immediate surgery. Highly trustworthy.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-7',
    name: 'Dr. Neha Deshmukh',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&q=80&w=600',
    specialty: 'Psychiatrist',
    specialtyId: 'psychiatrist',
    qualifications: 'MBBS, MD (Psychiatry), Fellowship in Clinical Neuropsychiatry',
    experienceYears: 10,
    clinicName: 'MindCare Neuro-Psychiatry Centre',
    address: 'FC Road, Shivaji Nagar, Pune - 411005',
    city: 'Pune',
    languages: ['English', 'Marathi', 'Hindi'],
    rating: 4.9,
    reviewCount: 275,
    nextAvailableSlot: 'Today, 07:00 PM',
    feeINR: 1200,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Neha Deshmukh is a compassionate psychiatrist dedicated to treating clinical anxiety, burnout, major depression, panic attacks, OCD, and adult insomnia through medical therapy and cognitive support in a completely confidential, non-judgmental space.',
    registrationNumber: 'MMC-2014-91024',
    availableToday: true,
    services: [
      { name: 'Psychiatric Diagnostic Assessment', feeINR: 1200 },
      { name: 'Anxiety & Panic Management', feeINR: 1400 },
      { name: 'Insomnia & Sleep Disorder Therapy', feeINR: 1200 },
      { name: 'Depression Medical Consultation', feeINR: 1300 }
    ],
    reviews: [
      {
        id: 'rev-9',
        author: 'Shalini Patil',
        city: 'Pune',
        rating: 5,
        date: '6 days ago',
        comment: 'She gave me hope during one of the most anxious periods of my life. Her video consultations are private, punctual and empathetic.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-8',
    name: 'Dr. Vikramaditya Rao',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&q=80&w=600',
    specialty: 'ENT Specialist',
    specialtyId: 'ent',
    qualifications: 'MBBS, MS (ENT), DOHNS (Royal College of Surgeons, Edinburgh)',
    experienceYears: 15,
    clinicName: 'SIMS Hospital ENT & Sinus Centre',
    address: 'No 1, Jawaharlal Nehru Salai, Vadapalani, Chennai - 600026',
    city: 'Chennai',
    languages: ['English', 'Tamil', 'Hindi'],
    rating: 4.8,
    reviewCount: 390,
    nextAvailableSlot: 'Today, 04:00 PM',
    feeINR: 699,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Vikramaditya Rao is a senior ENT specialist and endoscopic sinus surgeon with expertise in chronic rhinosinusitis, tinnitus, allergic rhinitis, tonsil infections, and inner ear balance disorders.',
    registrationNumber: 'TMC-2009-32819',
    availableToday: true,
    services: [
      { name: 'Complete ENT Examination', feeINR: 699 },
      { name: 'Nasal Endoscopy & Sinus Review', feeINR: 999 },
      { name: 'Hearing & Tinnitus Assessment', feeINR: 850 },
      { name: 'Vertigo & Balance Evaluation', feeINR: 1100 }
    ],
    reviews: [
      {
        id: 'rev-10',
        author: 'Venkatesh Raman',
        city: 'Chennai',
        rating: 5,
        date: '3 weeks ago',
        comment: 'Cured my 2-year old recurring sinus headache within 2 weeks of following his medication advice. Very humble and knowledgeable.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-9',
    name: 'Dr. Sunita Kulkarni',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=600',
    specialty: 'Ophthalmologist',
    specialtyId: 'ophthalmologist',
    qualifications: 'MBBS, MS (Ophthalmology), Fellow in Cornea & Refractive Surgery',
    experienceYears: 12,
    clinicName: 'Narayana Nethralaya Eye Care',
    address: 'Chord Road, Rajajinagar, Bengaluru - 560010',
    city: 'Bengaluru',
    languages: ['English', 'Kannada', 'Hindi', 'Marathi'],
    rating: 4.9,
    reviewCount: 340,
    nextAvailableSlot: 'Tomorrow, 09:30 AM',
    feeINR: 600,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Sunita Kulkarni is an eye surgeon specializing in comprehensive eye exams, digital eye strain relief, dry eye therapy, modern cataract microsurgery, and diabetic retinopathy screenings.',
    registrationNumber: 'KMC-2012-40192',
    availableToday: false,
    services: [
      { name: 'Comprehensive Eye Examination', feeINR: 600 },
      { name: 'Computer Vision Syndrome & Dry Eye Therapy', feeINR: 750 },
      { name: 'Cataract & Lasik Pre-op Assessment', feeINR: 1200 },
      { name: 'Glaucoma Pressure Screening', feeINR: 900 }
    ],
    reviews: [
      {
        id: 'rev-11',
        author: 'Aravind Swamy',
        city: 'Bengaluru',
        rating: 5,
        date: '1 week ago',
        comment: 'Excellent diagnosis for severe dry eyes caused by 10 hours of daily laptop work. Custom eye drops brought immediate relief.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-10',
    name: 'Dr. Aditya Banerjee',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600',
    specialty: 'Dentist',
    specialtyId: 'dentist',
    qualifications: 'BDS, MDS (Conservative Dentistry & Endodontics)',
    experienceYears: 11,
    clinicName: 'SmileCraft Advanced Dental Care',
    address: 'Park Street, Kolkata - 700016',
    city: 'Kolkata',
    languages: ['English', 'Bengali', 'Hindi'],
    rating: 4.9,
    reviewCount: 420,
    nextAvailableSlot: 'Today, 02:30 PM',
    feeINR: 499,
    consultationModes: ['clinic', 'video'],
    about: 'Dr. Aditya Banerjee is an endodontist specializing in painless single-visit root canal treatments, teeth whitening, tooth fillings, wisdom tooth extractions, and smile design aesthetics.',
    registrationNumber: 'WBDC-2013-18291',
    availableToday: true,
    services: [
      { name: 'Comprehensive Dental Check & X-Ray Review', feeINR: 499 },
      { name: 'Painless Root Canal Consultation', feeINR: 799 },
      { name: 'Teeth Cleaning & Polishing', feeINR: 1200 },
      { name: 'Wisdom Tooth Evaluation', feeINR: 600 }
    ],
    reviews: [
      {
        id: 'rev-12',
        author: 'Debashis Roy',
        city: 'Kolkata',
        rating: 5,
        date: '5 days ago',
        comment: 'Totally pain-free root canal! Dr. Banerjee explains every step on the monitor before doing anything. Top-notch sterilization hygiene.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-11',
    name: 'Dr. Tarun Verma',
    gender: 'male',
    photo: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&q=80&w=600',
    specialty: 'General Physician',
    specialtyId: 'general-physician',
    qualifications: 'MBBS, DNB (Internal Medicine)',
    experienceYears: 8,
    clinicName: 'Manipal Hospital Outpatient Care',
    address: '98, HAL Old Airport Rd, Kodihalli, Bengaluru - 560017',
    city: 'Bengaluru',
    languages: ['English', 'Hindi', 'Kannada'],
    rating: 4.7,
    reviewCount: 215,
    nextAvailableSlot: 'Today, 05:00 PM',
    feeINR: 550,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Tarun Verma is an internal medicine physician focusing on infectious diseases, lifestyle disorders, gastrointestinal infections, hypertension screening, and health check-up followups.',
    registrationNumber: 'KMC-2016-52194',
    availableToday: true,
    services: [
      { name: 'Consultation & Prescription', feeINR: 550 },
      { name: 'Gastroenteritis & Food Poisoning Relief', feeINR: 650 },
      { name: 'Blood Pressure & Lipid Review', feeINR: 700 }
    ],
    reviews: [
      {
        id: 'rev-13',
        author: 'Mahesh G',
        city: 'Bengaluru',
        rating: 5,
        date: '2 weeks ago',
        comment: 'Very polite, quick response on video consultation, and clear diet instructions alongside the medications.',
        verified: true
      }
    ]
  },
  {
    id: 'doc-12',
    name: 'Dr. Meenakshi Sundaram',
    gender: 'female',
    photo: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=600',
    specialty: 'Dermatologist',
    specialtyId: 'dermatologist',
    qualifications: 'MBBS, MD (Dermatology), FAM (Fellow in Aesthetic Medicine)',
    experienceYears: 14,
    clinicName: 'KIMS Skin Institute',
    address: '1-8-31/1, Minister Road, Secunderabad, Hyderabad - 500003',
    city: 'Hyderabad',
    languages: ['English', 'Telugu', 'Hindi', 'Tamil'],
    rating: 4.8,
    reviewCount: 360,
    nextAvailableSlot: 'Tomorrow, 03:30 PM',
    feeINR: 750,
    consultationModes: ['video', 'clinic'],
    about: 'Dr. Meenakshi Sundaram is an aesthetic dermatologist and laser specialist treating pigmentation, dark circles, melasma, psoriasis, vitiligo, and fungal infections with evidence-based protocols.',
    registrationNumber: 'TSMC-2010-38410',
    availableToday: false,
    services: [
      { name: 'Dermatology Consultation', feeINR: 750 },
      { name: 'Pigmentation & Melasma Therapy', feeINR: 1100 },
      { name: 'Acne Control Protocol', feeINR: 900 }
    ],
    reviews: [
      {
        id: 'rev-14',
        author: 'Sravani Reddy',
        city: 'Hyderabad',
        rating: 5,
        date: '1 month ago',
        comment: 'Best dermatologist in Secunderabad! Highly scientific approach and no false promises. My skin cleared up completely.',
        verified: true
      }
    ]
  }
];
