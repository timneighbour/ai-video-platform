/**
 * One-time script: clear idempotency records for the 5 pending cinematic scenes
 * of job 720001 so they can be re-dispatched with new Seedance prompts.
 *
 * Scenes: 750025, 750028, 750030, 750034, 750036
 * Key format: job:720001:scene:{id}:provider:wavespeed:attempt:1
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const sceneIds = [750025, 750028, 750030, 750034, 750036];
const keys = sceneIds.map(id => `job:720001:scene:${id}:provider:wavespeed:attempt:1`);

console.log("Clearing idempotency records for:", keys);

// Show current state
const [before] = await conn.execute(
  `SELECT idempotencyKey, pjlStatus, createdAt FROM providerJobLogs WHERE idempotencyKey IN (${keys.map(() => "?").join(",")})`,
  keys
);
console.log("Before:", before.length, "records found");
before.forEach(r => console.log(" -", r.idempotencyKey, "status:", r.status));

// Delete the records
const [result] = await conn.execute(
  `DELETE FROM providerJobLogs WHERE idempotencyKey IN (${keys.map(() => "?").join(",")})`,
  keys
);
console.log("Deleted:", result.affectedRows, "records");

// Also check for attempt:2 records (in case there were retries)
const keys2 = sceneIds.map(id => `job:720001:scene:${id}:provider:wavespeed:attempt:2`);
const [result2] = await conn.execute(
  `DELETE FROM providerJobLogs WHERE idempotencyKey IN (${keys2.map(() => "?").join(",")})`,
  keys2
);
console.log("Deleted attempt:2 records:", result2.affectedRows);

await conn.end();
console.log("Done.");
