import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.MYSQL_PASSWORD || '240407',
    database: 'medinest_db'
  });

  const [rows] = await conn.query('SELECT id, doctor_id, patient_name, start_datetime, status FROM appointments');
  console.log('ALL APPOINTMENTS:');
  console.log(rows);

  const [deleteResult] = await conn.query("DELETE FROM appointments WHERE YEAR(start_datetime) = 2001 OR YEAR(start_datetime) < 2025");
  console.log('DELETED 2001/OLD APPOINTMENTS:', deleteResult);

  const [remaining] = await conn.query('SELECT id, doctor_id, patient_name, start_datetime, status FROM appointments');
  console.log('REMAINING APPOINTMENTS:');
  console.log(remaining);

  await conn.end();
}

main().catch(console.error);
