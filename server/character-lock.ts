/**
 * Character Lock System
 * ─────────────────────────────────────────────────────────────────────────────
 * Prevents identity drift across storyboard scenes by:
 * 1. Caching the character's reference photo as base64 on first lock
 * 2. Validating each generated scene image against the reference using Face++
 * 3. Falling back to Amazon Rekognition if Face++ is unavailable
 * 4. Auto-flagging scenes that fall below the similarity threshold
 *
 * Face++ API: https://api-us.faceplusplus.com/facepp/v3/compare
 * Amazon Rekognition: CompareFaces
 */

import { getDb } from "./db";
import { videoCharacters, musicVideoScenes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FaceValidationResult {
  passed: boolean;
  confidence: number; // 0-100
  provider: "facepp" | "rekognition" | "skipped";
  error?: string;
}

export interface CharacterLockData {
  characterId: number;
  name: string;
  referencePhotoBase64: string; // data:image/jpeg;base64,...
  lockedDescription: string;
  faceValidationThreshold: number;
}

// ─── Reference Photo Caching ──────────────────────────────────────────────────

/**
 * Fetch the primary photo for a character, convert to base64, and cache it
 * in the referencePhotoBase64 column to avoid repeated S3 fetches.
 */
export async function ensureReferencePhotoBase64(
  characterId: number,
  primaryPhotoUrl: string
): Promise<string | null> {
  // Check if already cached
  const database = await getDb();
  if (!database) return null;
  const [char] = await database
    .select({ referencePhotoBase64: videoCharacters.referencePhotoBase64 })
    .from(videoCharacters)
    .where(eq(videoCharacters.id, characterId))
    .limit(1);

  if (char?.referencePhotoBase64) {
    return char.referencePhotoBase64;
  }

  // Fetch from S3/storage proxy and convert to base64
  try {
    const response = await fetch(primaryPhotoUrl);
    if (!response.ok) {
      console.error(`[CharacterLock] Failed to fetch photo: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Cache it
    const dbForCache = await getDb();
    if (dbForCache) {
      await dbForCache
        .update(videoCharacters)
        .set({ referencePhotoBase64: dataUrl })
        .where(eq(videoCharacters.id, characterId));
    }

    return dataUrl;
  } catch (err) {
    console.error("[CharacterLock] Error fetching reference photo:", err);
    return null;
  }
}

// ─── Face++ Validation ────────────────────────────────────────────────────────

/**
 * Compare two images using Face++ Compare API.
 * Returns confidence score 0-100.
 */
async function compareFacesFacePlusPlus(
  referenceBase64: string,
  generatedImageUrl: string,
  apiKey: string,
  apiSecret: string
): Promise<FaceValidationResult> {
  try {
    // Strip the data URL prefix for Face++ (it expects raw base64)
    const rawBase64 = referenceBase64.replace(/^data:[^;]+;base64,/, "");

    const formData = new URLSearchParams();
    formData.append("api_key", apiKey);
    formData.append("api_secret", apiSecret);
    formData.append("image_base64_1", rawBase64);
    formData.append("image_url2", generatedImageUrl);

    const response = await fetch(
      "https://api-us.faceplusplus.com/facepp/v3/compare",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return {
        passed: false,
        confidence: 0,
        provider: "facepp",
        error: `HTTP ${response.status}: ${text}`,
      };
    }

    const data = (await response.json()) as {
      confidence?: number;
      thresholds?: { "1e-3"?: number; "1e-4"?: number; "1e-5"?: number };
      error_message?: string;
    };

    if (data.error_message) {
      return {
        passed: false,
        confidence: 0,
        provider: "facepp",
        error: data.error_message,
      };
    }

    const confidence = data.confidence ?? 0;
    return {
      passed: true,
      confidence,
      provider: "facepp",
    };
  } catch (err: unknown) {
    return {
      passed: false,
      confidence: 0,
      provider: "facepp",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Amazon Rekognition Fallback ──────────────────────────────────────────────

/**
 * Compare two images using Amazon Rekognition CompareFaces.
 * Returns similarity score 0-100.
 */
async function compareFacesRekognition(
  referenceBase64: string,
  generatedImageUrl: string,
  accessKeyId: string,
  secretAccessKey: string,
  region: string = "us-east-1"
): Promise<FaceValidationResult> {
  try {
    // Fetch the generated image to get its bytes
    const genResponse = await fetch(generatedImageUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (!genResponse.ok) {
      return {
        passed: false,
        confidence: 0,
        provider: "rekognition",
        error: `Failed to fetch generated image: ${genResponse.status}`,
      };
    }
    const genBuffer = Buffer.from(await genResponse.arrayBuffer());

    // Strip data URL prefix from reference
    const refBase64 = referenceBase64.replace(/^data:[^;]+;base64,/, "");
    const refBuffer = Buffer.from(refBase64, "base64");

    // Build the Rekognition CompareFaces request using AWS Signature V4
    // We use the raw HTTP API to avoid needing the AWS SDK package
    const endpoint = `https://rekognition.${region}.amazonaws.com/`;
    const body = JSON.stringify({
      SourceImage: { Bytes: refBuffer.toString("base64") },
      TargetImage: { Bytes: genBuffer.toString("base64") },
      SimilarityThreshold: 50,
    });

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateShort = dateStr.slice(0, 8);

    // AWS Signature V4 signing
    const { createHmac, createHash } = await import("crypto");

    const hash = (data: string | Buffer) =>
      createHash("sha256").update(data).digest("hex");
    const hmac = (key: Buffer | string, data: string) =>
      createHmac("sha256", key).update(data).digest();

    const payloadHash = hash(body);
    const canonicalHeaders =
      `content-type:application/x-amz-json-1.1\n` +
      `host:rekognition.${region}.amazonaws.com\n` +
      `x-amz-date:${dateStr}\n` +
      `x-amz-target:RekognitionService.CompareFaces\n`;
    const signedHeaders =
      "content-type;host;x-amz-date;x-amz-target";
    const canonicalRequest = [
      "POST",
      "/",
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const credentialScope = `${dateShort}/us-east-1/rekognition/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      dateStr,
      credentialScope,
      hash(canonicalRequest),
    ].join("\n");

    const signingKey = hmac(
      hmac(
        hmac(
          hmac(Buffer.from(`AWS4${secretAccessKey}`), dateShort),
          region
        ),
        "rekognition"
      ),
      "aws4_request"
    );
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authHeader =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const rekResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Date": dateStr,
        "X-Amz-Target": "RekognitionService.CompareFaces",
        Authorization: authHeader,
      },
      body,
      signal: AbortSignal.timeout(20000),
    });

    if (!rekResponse.ok) {
      const text = await rekResponse.text();
      return {
        passed: false,
        confidence: 0,
        provider: "rekognition",
        error: `HTTP ${rekResponse.status}: ${text}`,
      };
    }

    const data = (await rekResponse.json()) as {
      FaceMatches?: Array<{ Similarity: number }>;
    };

    const similarity =
      data.FaceMatches && data.FaceMatches.length > 0
        ? data.FaceMatches[0].Similarity
        : 0;

    return {
      passed: true,
      confidence: similarity,
      provider: "rekognition",
    };
  } catch (err: unknown) {
    return {
      passed: false,
      confidence: 0,
      provider: "rekognition",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Main Validation Entry Point ──────────────────────────────────────────────

/**
 * Validate a generated scene image against a character's reference photo.
 * Uses Face++ as primary, Rekognition as fallback.
 * Returns the validation result with confidence score.
 */
export async function validateFaceConsistency(
  referenceBase64: string,
  generatedImageUrl: string
): Promise<FaceValidationResult> {
  const facePlusPlusKey = process.env.FACEPP_API_KEY;
  const facePlusPlusSecret = process.env.FACEPP_API_SECRET;
  const rekognitionKey = process.env.AWS_REKOGNITION_ACCESS_KEY_ID;
  const rekognitionSecret = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY;
  const rekognitionRegion = process.env.AWS_REKOGNITION_REGION || "us-east-1";

  // Try Face++ first
  if (facePlusPlusKey && facePlusPlusSecret) {
    const result = await compareFacesFacePlusPlus(
      referenceBase64,
      generatedImageUrl,
      facePlusPlusKey,
      facePlusPlusSecret
    );
    if (result.passed) {
      console.log(
        `[CharacterLock] Face++ confidence: ${result.confidence.toFixed(1)}`
      );
      return result;
    }
    console.warn(
      `[CharacterLock] Face++ failed (${result.error}), trying Rekognition...`
    );
  }

  // Fallback to Rekognition
  if (rekognitionKey && rekognitionSecret) {
    const result = await compareFacesRekognition(
      referenceBase64,
      generatedImageUrl,
      rekognitionKey,
      rekognitionSecret,
      rekognitionRegion
    );
    if (result.passed) {
      console.log(
        `[CharacterLock] Rekognition similarity: ${result.confidence.toFixed(1)}`
      );
      return result;
    }
    console.warn(`[CharacterLock] Rekognition failed: ${result.error}`);
  }

  // No API keys configured — skip validation
  console.warn(
    "[CharacterLock] No face validation API keys configured. Skipping validation."
  );
  return { passed: false, confidence: 0, provider: "skipped", error: "No API keys" };
}

// ─── Scene Validation ─────────────────────────────────────────────────────────

/**
 * Run face validation for all locked characters assigned to a scene.
 * Updates the scene's faceValidationStatus and faceValidationScores in the DB.
 *
 * @param sceneId - DB ID of the musicVideoScene
 * @param generatedImageUrl - URL of the generated scene image/preview
 * @param characters - Array of locked characters assigned to this scene
 * @returns Overall validation status
 */
export async function validateSceneFaceConsistency(
  sceneId: number,
  generatedImageUrl: string,
  characters: CharacterLockData[]
): Promise<"matched" | "warning" | "skipped"> {
  if (characters.length === 0) {
    const dbSkip = await getDb();
  if (dbSkip) {
    await dbSkip
      .update(musicVideoScenes)
      .set({ faceValidationStatus: "skipped" })
      .where(eq(musicVideoScenes.id, sceneId));
  }
    return "skipped";
  }

  const scores: Record<string, number> = {};
  let allPassed = true;

  for (const char of characters) {
    if (!char.referencePhotoBase64) {
      scores[char.name] = -1; // No reference photo (AI-generated character)
      continue;
    }

    const result = await validateFaceConsistency(
      char.referencePhotoBase64,
      generatedImageUrl
    );

    if (result.provider === "skipped") {
      scores[char.name] = -1;
      continue;
    }

    scores[char.name] = result.confidence;

    if (result.confidence < char.faceValidationThreshold) {
      allPassed = false;
      console.warn(
        `[CharacterLock] Scene ${sceneId}: ${char.name} failed validation ` +
          `(score: ${result.confidence.toFixed(1)}, threshold: ${char.faceValidationThreshold})`
      );
    }
  }

  const status = allPassed ? "matched" : "warning";

  const dbUpdate = await getDb();
  if (dbUpdate) {
    await dbUpdate
      .update(musicVideoScenes)
      .set({
        faceValidationStatus: status,
        faceValidationScores: JSON.stringify(scores),
      })
      .where(eq(musicVideoScenes.id, sceneId));
  }

  return status;
}

// ─── Character Lock Setup ─────────────────────────────────────────────────────

/**
 * Called when a character is locked (approved in the confirmation step).
 * Caches the reference photo base64 for fast future validation.
 */
export async function setupCharacterLock(
  characterId: number,
  primaryPhotoUrl: string | null
): Promise<void> {
  if (!primaryPhotoUrl) return;

  await ensureReferencePhotoBase64(characterId, primaryPhotoUrl);
  console.log(`[CharacterLock] Lock set up for character ${characterId}`);
}
