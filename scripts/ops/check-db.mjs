import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('DESCRIBE musicVideoJobs');
const cols = rows.filter(r => r.Field === 'instrumentAnalysis');
console.log('instrumentAnalysis column:', JSON.stringify(cols));
await conn.end();
