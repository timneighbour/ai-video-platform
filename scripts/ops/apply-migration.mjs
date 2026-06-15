import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const config = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

const migrationSQL = fs.readFileSync(
  path.join(process.cwd(), 'drizzle/migrations/0001_add_missing_musicVideoJobs_columns.sql'),
  'utf-8'
);

async function applyMigration() {
  let connection;
  try {
    console.log('Connecting with config:', { host: config.host, user: config.user, database: config.database });
    connection = await mysql.createConnection(config);
    console.log('Connected to database');
    
    const statements = migrationSQL.split(';').filter(s => s.trim());
    console.log(`Found ${statements.length} statements to execute`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 100) + '...');
        try {
          await connection.execute(statement);
          console.log('OK');
        } catch (stmtError) {
          console.error('Error:', stmtError.message);
          throw stmtError;
        }
      }
    }
    
    console.log('\nMigration applied successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

applyMigration();
