/**
 * run-fix-zara-env-url.mjs
 *
 * Uploads the Zara environment portrait PNG to S3 using the correct
 * storagePut endpoint (v1/storage/upload?path=...) and updates the DB
 * with the permanent CDN URL.
 *
 * Usage: node server/run-fix-zara-env-url.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const CHAR_ID = 570001;
const LOCAL_FILE = "/tmp/zara-env-ref-1780432502684.png";
const STORAGE_KEY = "characters/zara-env-ref-stage2-870022.png";

async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!baseUrl || !apiKey) throw new Error("Forge API not configured");

  const normalizedKey = relKey.replace(/^\/+/, "");
  const uploadUrl = new URL("v1/storage/upload", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  uploadUrl.searchParams.set("path", normalizedKey);

  const fileName = normalizedKey.split("/").pop() ?? normalizedKey;
  const blob = new Blob([data], { type: contentType });
  const formData = new FormData();
  formData.append("file", blob, fileName);

  console.log(`  Uploading to: ${uploadUrl.toString().slice(0, 80)}...`);
  const resp = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage upload failed (${resp.status}): ${msg.slice(0, 200)}`);
  }

  const result = await resp.json();
  return { key: normalizedKey, url: result.url };
}

async function main() {
  console.log("=== Fix Zara environmentRefUrl with permanent S3 URL ===\n");

  const imgBuffer = readFileSync(LOCAL_FILE);
  console.log(`  Local file: ${LOCAL_FILE} (${(imgBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

  const { key, url } = await storagePut(STORAGE_KEY, imgBuffer, "image/png");
  console.log(`  ✓ Uploaded: key=${key}`);
  console.log(`  ✓ URL: ${url}`);

  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  await conn.execute(
    `UPDATE videoCharacters SET environmentRefUrl = ?, updatedAt = NOW() WHERE id = ?`,
    [url, CHAR_ID]
  );
  console.log(`\n  ✓ DB updated: videoCharacters.environmentRefUrl = ${url.slice(0, 80)}...`);

  // Verify
  const [rows] = await conn.execute(
    "SELECT id, name, environmentRefUrl, autoPrepStatus FROM videoCharacters WHERE id = ?",
    [CHAR_ID]
  );
  console.log("\n  Final state:", rows[0]);

  await conn.end();
  console.log("\n=== Fix complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
