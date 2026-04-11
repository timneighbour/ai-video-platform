/**
 * Splits the batch regeneration + master portrait procedures out of musicVideo.ts
 * into a new file musicVideoExtensions.ts, then merges them back via router spread.
 */
import { readFileSync, writeFileSync } from "fs";

const mainPath = "server/routers/musicVideo.ts";
const extPath = "server/routers/musicVideoExtensions.ts";

const content = readFileSync(mainPath, "utf8");
const lines = content.split("\n");

// Lines are 1-indexed in the comments below
const BATCH_START = 1919;  // 0-indexed: line 1920 "// ─── Batch InstantID Regeneration"
const ROUTER_CLOSE = 2206; // 0-indexed: line 2207 "});"

const extractedLines = lines.slice(BATCH_START, ROUTER_CLOSE);
const beforeBatch = lines.slice(0, BATCH_START);
const afterRouter = lines.slice(ROUTER_CLOSE); // includes "});" and everything after

// Verify extraction
console.log(`Extracted ${extractedLines.length} lines`);
console.log("First extracted:", extractedLines[0].substring(0, 80));
console.log("Last extracted:", extractedLines[extractedLines.length - 1].substring(0, 80));

// Build the extensions file
// The extracted lines are procedure entries inside the router object (they start with "  startBatchRegeneration:")
// We need to wrap them in a router() call
const extHeader = `/**
 * Music Video Extensions Router
 * Batch regeneration + master portrait generation procedures.
 * Extracted from musicVideo.ts to keep the main router within LSP type-inference limits.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { videoCharacters, videoCharacterPhotos, musicVideoJobs } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fal } from "@fal-ai/client";
if (process.env.FAL_AI_API_KEY) {
  fal.config({ credentials: process.env.FAL_AI_API_KEY });
}
import { storagePut } from "../storage";
import { generateFaceConsistentImage } from "../_core/fluxPuLID";

export const musicVideoExtensionsRouter = router({
`;

const extFooter = `});
`;

// The extracted lines already have the procedure bodies — write them directly
const extContent = extHeader + extractedLines.join("\n") + "\n" + extFooter;
writeFileSync(extPath, extContent, "utf8");
console.log(`Written ${extPath}`);

// Build the trimmed musicVideo.ts:
// - Remove the extracted lines
// - Add import of musicVideoExtensionsRouter
// - Spread it into the main router before the closing });
const importLine = `import { musicVideoExtensionsRouter } from "./musicVideoExtensions";`;

// Find the existing imports block end (after the last import line before the router definition)
// Insert the new import after the existing imports
let importInsertIdx = -1;
for (let i = 0; i < 40; i++) {
  if (lines[i].startsWith("import ")) importInsertIdx = i;
}

const newLines = [
  ...lines.slice(0, importInsertIdx + 1),
  importLine,
  ...beforeBatch.slice(importInsertIdx + 1),
  // Replace the extracted procedures with a spread
  `  ...musicVideoExtensionsRouter._def.procedures,`,
  ...afterRouter,
];

writeFileSync(mainPath, newLines.join("\n"), "utf8");
console.log(`Updated ${mainPath} (${newLines.length} lines, was ${lines.length})`);
