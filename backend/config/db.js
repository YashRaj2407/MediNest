import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'medinest_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+05:30', // IST
});

export default pool;
