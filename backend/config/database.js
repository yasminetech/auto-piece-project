const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'autopiece_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true
});

// Test the pool connection
pool.getConnection()
  .then((connection) => {
    console.log('✓ Database pool connection successful');
    connection.release();
  })
  .catch((err) => {
    console.error('✗ Database pool connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
