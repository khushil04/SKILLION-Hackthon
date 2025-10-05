// backend/db.js
const { Pool } = require('pg');   // ✅ import Pool properly
require('dotenv').config();

const pool = new Pool({
  host: "db.sreegmyfphfbdpldjmnw.supabase.co", // Supabase host
  port: 5432,
  user: "postgres",                            // your Supabase DB username
  password: process.env.DB_PASSWORD,           // keep password in .env
  database: "postgres",                        // default Supabase database
  ssl: { rejectUnauthorized: false },          // required for Supabase
  family: 4                                    // 👈 force IPv4
});

module.exports = pool;




// // backend/db.js
// const { Pool } = require('pg');
// require('dotenv').config();
// if (!process.env.DATABASE_URL) {
//   console.error('Missing DATABASE_URL environment variable. Set DATABASE_URL to your Postgres connection string.');
//   // throw a clear error so server startup fails fast with guidance
//   throw new Error('DATABASE_URL environment variable is required');
// }

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL, // Supabase or postgres://
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
// });
// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool
// };
