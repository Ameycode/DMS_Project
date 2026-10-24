const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ev_charging_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true,
  timezone: '+00:00',
  decimalNumbers: true
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS current_db');
    connection.release();
    console.log(`[DB] Connected successfully to MySQL ${rows[0].version} (Database: ${rows[0].current_db})`);
    return { success: true, version: rows[0].version, database: rows[0].current_db };
  } catch (error) {
    console.error(`[DB Error] Failed to connect to MySQL database '${process.env.DB_NAME}': ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  pool,
  testConnection
};
