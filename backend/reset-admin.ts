import pool from './src/config/database';

async function resetAdminRole() {
  try {
    const res = await pool.query(`UPDATE users SET role = 'admin' WHERE email = 'admin@chatbot.com' RETURNING *`);
    console.log('✅ Updated users:', res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

resetAdminRole();
