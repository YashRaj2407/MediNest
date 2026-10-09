const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'medinest_db',
      port: process.env.MYSQL_PORT || 3306
    });

    const [pCols] = await connection.query('DESCRIBE profiles');
    console.log('--- profiles columns ---');
    pCols.forEach(c => console.log(` - ${c.Field}: ${c.Type}`));

    const [dCols] = await connection.query('DESCRIBE doctor_profiles');
    console.log('--- doctor_profiles columns ---');
    dCols.forEach(c => console.log(` - ${c.Field}: ${c.Type}`));

    await connection.end();
  } catch (err) {
    console.error('DB Error:', err.message);
  }
}
check();
