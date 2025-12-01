// scripts/run-migrations.js
// Chạy: node scripts/run-migrations.js

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connected to Neon PostgreSQL');
    
    // Chạy migration 001
    const migration001 = fs.readFileSync(
      path.join(__dirname, '../migrations/001_create_album_tables.sql'), 
      'utf8'
    );
    console.log('📦 Running migration 001_create_album_tables.sql...');
    await client.query(migration001);
    console.log('✅ Migration 001 completed');
    
    // Chạy migration 002 (seed data)
    const migration002 = fs.readFileSync(
      path.join(__dirname, '../migrations/002_seed_albums.sql'), 
      'utf8'
    );
    console.log('📦 Running migration 002_seed_albums.sql...');
    await client.query(migration002);
    console.log('✅ Migration 002 completed');
    
    // Verify
    const { rows: albums } = await client.query('SELECT * FROM albums');
    console.log(`\n📁 Albums in database: ${albums.length}`);
    albums.forEach(a => console.log(`  - ${a.slug}: ${a.title}`));
    
    const { rows: images } = await client.query('SELECT COUNT(*) as count FROM images');
    console.log(`🖼️  Total images: ${images[0].count}`);
    
    console.log('\n🎉 All migrations completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
