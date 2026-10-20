import pool from '../config/db.js';
import crypto from 'crypto';

const INITIAL_REVIEWS = [
  {
    doctor_id: 'doc-1',
    author: 'Pooja Verma',
    city: 'New Delhi',
    rating: 5,
    comment: 'Dr. Ananya listened so patiently to my cystic acne issues. The prescription worked wonders in just 3 weeks without unnecessary costly procedures.',
  },
  {
    doctor_id: 'doc-1',
    author: 'Ramanjot Singh',
    city: 'Gurugram',
    rating: 5,
    comment: 'Very professional clinic setup and seamless digital prescription. The video follow-up was right on time.',
  },
  {
    doctor_id: 'doc-2',
    author: 'Sunil Nair',
    city: 'Bengaluru',
    rating: 5,
    comment: 'Dr. Mehta prevented an unnecessary stent proposed elsewhere. He took his time explaining my stress test results and adjusted my medication.',
  },
  {
    doctor_id: 'doc-2',
    author: 'Meenakshi Iyer',
    city: 'Bengaluru',
    rating: 5,
    comment: 'Extremely reassuring demeanour. The clinic staff at Apollo Bannerghatta was also very courteous.',
  },
  {
    doctor_id: 'doc-3',
    author: 'Suman Roy',
    city: 'Kolkata',
    rating: 5,
    comment: 'Dr. Kavya is wonderful! She answered every question about my first pregnancy patiently and made me feel completely at ease.',
  },
  {
    doctor_id: 'doc-4',
    author: 'Devendra Patel',
    city: 'Ahmedabad',
    rating: 5,
    comment: 'Booked a video appointment when I had high fever. Doctor came online in 2 minutes, gave an exact lab test list and safe medicines. Relieved within 2 days.',
  },
  {
    doctor_id: 'doc-5',
    author: 'Aarti Kulkarni',
    city: 'Pune',
    rating: 5,
    comment: 'Our baby was having severe colic. Dr. Priya diagnosed the milk sensitivity immediately. She is exceptionally warm and caring.',
  },
  {
    doctor_id: 'doc-6',
    author: 'Harpreet Gill',
    city: 'Chandigarh',
    rating: 5,
    comment: "Dr. Singhal gave an honest assessment of my mother's knee pain. He suggested targeted physiotherapy instead of immediate surgery. Highly trustworthy.",
  },
  {
    doctor_id: 'doc-7',
    author: 'Tanya Sen',
    city: 'Mumbai',
    rating: 5,
    comment: 'She gave me hope during one of the most anxious periods of my life. Her video consultations are private, punctual and empathetic.',
  },
  {
    doctor_id: 'doc-8',
    author: 'Vikram Joshi',
    city: 'Jaipur',
    rating: 5,
    comment: 'Cured my 2-year old recurring sinus headache within 2 weeks of following his medication advice. Very humble and knowledgeable.',
  },
  {
    doctor_id: 'doc-9',
    author: 'Deepak Rao',
    city: 'Hyderabad',
    rating: 5,
    comment: 'Excellent diagnosis for severe dry eyes caused by 10 hours of daily laptop work. Custom eye drops brought immediate relief.',
  },
  {
    doctor_id: 'doc-10',
    author: 'Sayani Mukherjee',
    city: 'Kolkata',
    rating: 5,
    comment: 'Totally pain-free root canal! Dr. Banerjee explains every step on the monitor before doing anything. Top-notch sterilization hygiene.',
  },
  {
    doctor_id: 'doc-11',
    author: 'Naveen Reddy',
    city: 'Bengaluru',
    rating: 5,
    comment: 'Very polite, quick response on video consultation, and clear diet instructions alongside the medications.',
  },
  {
    doctor_id: 'doc-12',
    author: 'Kavitha Swaminathan',
    city: 'Chennai',
    rating: 5,
    comment: 'Best dermatologist in Secunderabad! Highly scientific approach and no false promises. My skin cleared up completely.',
  }
];

export async function migrateReviews() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctor_reviews (
        id              VARCHAR(36)  NOT NULL,
        doctor_id       VARCHAR(36)  NOT NULL,
        patient_id      VARCHAR(255) NULL,
        patient_name    VARCHAR(255) NOT NULL DEFAULT 'Verified Patient',
        patient_city    VARCHAR(100) NULL DEFAULT 'India',
        rating          INT          NOT NULL,
        comment         TEXT         NULL,
        verified        BOOLEAN      NOT NULL DEFAULT TRUE,
        created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_doctor_reviews_doc (doctor_id),
        INDEX idx_doctor_reviews_patient (patient_id),
        INDEX idx_doctor_reviews_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[Reviews Migration] Table doctor_reviews verified/created.');

    // Seed initial reviews if table is empty
    const [rows] = await connection.query('SELECT COUNT(*) as cnt FROM doctor_reviews');
    if (rows[0].cnt === 0) {
      console.log('[Reviews Migration] Seeding initial verified doctor reviews...');
      for (const rev of INITIAL_REVIEWS) {
        const revId = 'rev-' + crypto.randomUUID().slice(0, 8);
        await connection.query(
          `INSERT INTO doctor_reviews (id, doctor_id, patient_name, patient_city, rating, comment, verified, created_at)
           VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
          [revId, rev.doctor_id, rev.author, rev.city, rev.rating, rev.comment]
        );
      }
      console.log(`[Reviews Migration] Seeded ${INITIAL_REVIEWS.length} initial reviews.`);
    }

  } catch (err) {
    console.error('[Reviews Migration Error]:', err);
    throw err;
  } finally {
    connection.release();
  }
}

// Run directly if invoked from command line
if (process.argv[1]?.endsWith('migrate_reviews.js')) {
  migrateReviews()
    .then(() => {
      console.log('[Reviews Migration] Completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
