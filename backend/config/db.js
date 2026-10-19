import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

function getPoolConfig() {
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (connectionUrl) {
    try {
      const parsed = new URL(connectionUrl);
      const isExternalProxy = parsed.hostname.includes('rlwy.net') || parsed.hostname.includes('aivencloud.com');
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        database: (parsed.pathname || '/medinest_db').replace(/^\//, '') || 'medinest_db',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
        timezone: '+05:30',
        ssl: isExternalProxy || process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      };
    } catch (_err) {
      return connectionUrl;
    }
  }

  const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost';
  const port = Number(process.env.MYSQL_PORT || process.env.MYSQLPORT) || 3306;
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '';
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'medinest_db';
  const isExternalProxy = host.includes('rlwy.net') || host.includes('aivencloud.com');

  return {
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    timezone: '+05:30',
    ssl: isExternalProxy || process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

const pool = mysql.createPool(getPoolConfig());

export async function checkDbConnection() {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1 as alive, DATABASE() as db, CURRENT_TIMESTAMP() as ts');
    conn.release();
    return {
      connected: true,
      database: rows[0]?.db,
      timestamp: rows[0]?.ts,
    };
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      code: err.code,
    };
  }
}

export default pool;
