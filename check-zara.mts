import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { videoCharacters } from './drizzle/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const db = drizzle(conn);

const chars = await db.select().from(videoCharacters).where(eq(videoCharacters.id, 420005));
if (chars.length === 0) {
  console.log('Character 420005 not found');
} else {
  const c = chars[0];
  console.log('Character 420005 full record:');
  for (const [key, val] of Object.entries(c)) {
    const display = typeof val === 'string' && val.length > 100 ? val.slice(0, 100) + '...' : val;
    console.log(`  ${key}: ${display}`);
  }
}

await conn.end();
