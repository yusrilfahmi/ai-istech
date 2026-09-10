import app from './app';
import pool from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

async function start() {
  try {
    // Verify database connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    client.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
