import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const config = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
};

async function runMigration() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('✓ Connected\n');
    
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0019_tranquil_ultragirl.sql'),
      'utf-8'
    );
    
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`Found ${statements.length} statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 80)}...`);
      try {
        await connection.execute(stmt);
        console.log('✓ OK\n');
      } catch (err) {
        console.error(`✗ FAILED: ${err.message}\n`);
        throw err;
      }
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();
