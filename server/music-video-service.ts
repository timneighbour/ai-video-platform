/**
 * Music Video Autopilot Service
 * Handles audio transcription, lyrics-driven storyboard generation,
 * per-scene video rendering, and final assembly.
 */
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDb } from "./db";
import { musicVideoJobs, musicVideoScenes } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import { initKlingAI } from "./ai-apis/kling";
import { initSeedance } from "./ai-apis/seedance";
import { submitFalSeedanceVideo, pollFalSeedanceVideo } from "./ai-apis/fal-seedance";
import type { RendererType } from "./products";
import { RENDERER_COSTS } from "./products";

const klingClient = initKlingAI();
const seedanceClient = initSeedance();

// Prefix used to distinguish fal.ai request IDs from Kling/Volcengine task IDs
const FAL_REQUEST_ID_PREFIX = "fal:";

const execAsync = promisify(exec);

const CREDITS_PER_SCENE = 10;
const SCENE_DURATION_SECONDS = 8; // each scene is 8 seconds

export function calculateSceneCount(audioDurationSeconds: number): number {
  // One scene every 8 seconds, minimum 3 scenes, maximum 45 scenes (~6 min)
  const count = Math.ceil(audioDurationSeconds / SCENE_DURATION_SECONDS);
  return Math.max(3, Math.min(45, count));
}

export function calculateCreditCost(sceneCount: number): number {
  return sceneCount * CREDITS_PER_SCENE;
}

/**
 * Transcribe audio from a URL using Whisper, returning full text + timestamped segments.
 * Saves the transcription to the job record in the database.
 */
export async function transcribeJobAudio(
  jobId: number,
  audioUrl: string
): Promise<{ text: string; segments: Array<{ start: number; end: number; text: string }> }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  // Mark as processing
  await db.update(musicVideoJobs)
    .set({ transcriptionStatus: "processing", updatedAt: new Date() })
    .where(eq(musicVideoJobs.id, jobId));

  try {
    const result = await transcribeAudio({ audioUrl });

    // Type-narrow: check for error response
    if ('error' in result) {
      throw new Error(result.error);
    }

    const segments = (result.segments || []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }));

    // Save transcription to DB
    await db.update(musicVideoJobs)
      .set({
        transcription: result.text,
        transcriptionStatus: "done",
        updatedAt: new Date(),
      })
      .where(eq(musicVideoJobs.id, jobId));

    return { text: result.text, segments };
  } catch (err) {
    await db.update(musicVideoJobs)
      .set({ transcriptionStatus: "failed", updatedAt: new Date() })
      .where(eq(musicVideoJobs.id, jobId));
    // Return empty transcription — storyboard will use theme only
    return { text: "", segments: [] };
  }
}

/**
 * Extract lyrics for a specific time window from Whisper segments.
 */
function extractLyricsForWindow(
  segments: Array<{ start: number; end: number; text: string }>,
  windowStart: number,
  windowEnd: number
): string {
  const relevant = segments.filter(
    (s) => s.end > windowStart && s.start < windowEnd
  );
  return relevant.map((s) => s.text).join(" ").trim();
}

/**
 * Generate a storyboard using LLM based on theme, lyrics, and song duration.
 * Returns an array of scene objects with prompts, timestamps, and lyrics.
 */
export async function generateStoryboard(
  themePrompt: string,
  genre: string | null | undefined,
  mood: string | null | undefined,
  audioDurationSeconds: number,
  title: string,
  lyricsSegments?: Array<{ start: number; end: number; text: string }>,
  lockedCharacters?: Array<{ name: string; role: string | null; lockedDescription: string }>
): Promise<Array<{
  sceneIndex: number;
  startTime: number;
  duration: number;
  prompt: string;
  visualStyle: string;
  lyrics: string;
}>> {
  const sceneCount = calculateSceneCount(audioDurationSeconds);
  const minutes = Math.floor(audioDurationSeconds / 60);
  const seconds = audioDurationSeconds % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Build scene windows and extract lyrics for each
  const sceneWindows = Array.from({ length: sceneCount }, (_, i) => {
    const startTime = i * SCENE_DURATION_SECONDS;
    const endTime = Math.min(startTime + SCENE_DURATION_SECONDS, audioDurationSeconds);
    const duration = endTime - startTime;
    const lyrics = lyricsSegments
      ? extractLyricsForWindow(lyricsSegments, startTime, endTime)
      : "";
    return { sceneIndex: i, startTime, duration, lyrics };
  });

  // Build a lyrics-aware scene list for the LLM prompt
  const sceneList = sceneWindows.map((w) =>
    `Scene ${w.sceneIndex + 1} (${w.startTime}s–${w.startTime + w.duration}s)${w.lyrics ? `: "${w.lyrics}"` : ""}`
  ).join("\n");

  const hasLyrics = lyricsSegments && lyricsSegments.length > 0;
  const hasLockedCharacters = lockedCharacters && lockedCharacters.length > 0;

  // Build character consistency block for the system prompt
  const characterConsistencyBlock = hasLockedCharacters
    ? `

⚠️ CHARACTER CONSISTENCY RULES — STRICTLY ENFORCED:
The following characters have locked visual briefs. You MUST reference them by name in every scene where they appear.
Do NOT change, embellish, or reinterpret their appearance. Do NOT add new characters unless instructed.

${lockedCharacters!.map((c) =>
  `CHARACTER: ${c.name}${c.role ? ` (${c.role})` : ""}
LOCKED APPEARANCE: ${c.lockedDescription}
RULE: Every scene must describe ${c.name} with EXACTLY this appearance. No outfit changes. No colour changes. No facial feature changes. No accessory changes.`
).join("\n\n")}

Storyboard Preview Rule: All storyboard scene prompts must reference the locked character appearance above so the user can verify consistency before confirming render.`
    : "";

  const systemPrompt = `You are a professional music video director and creative director. 
Your job is to create detailed, cinematic scene descriptions for AI video generation.
Each scene description must be:
- Highly visual and specific (describe lighting, camera angle, movement, subjects, atmosphere)
- Consistent with the overall theme and mood
${hasLyrics ? "- Visually inspired by the lyrics being sung in that scene — the imagery should reflect the words and emotions" : ""}
- Optimised for AI video generation (clear, vivid, no abstract concepts)
- Varied enough to create an interesting visual journey
- Between 50-100 words each${characterConsistencyBlock}

Return ONLY valid JSON, no markdown, no explanation.`;

  const userPrompt = `Create a music video storyboard for a song called "${title}".

Song details:
- Duration: ${durationStr} (${audioDurationSeconds} seconds)
- Theme/Concept: ${themePrompt}
- Genre: ${genre || "not specified"}
- Mood: ${mood || "not specified"}
- Number of scenes: ${sceneCount} (one scene every ${SCENE_DURATION_SECONDS} seconds)

${hasLyrics ? `Lyrics by scene (use these to inspire each scene's visuals — make the imagery match what is being sung):
${sceneList}

` : `Scene timeline:
${sceneList}

`}Return a JSON array of exactly ${sceneCount} scene objects. Each object must have:
- sceneIndex: number (0-based, matching the scene numbers above)
- startTime: number (seconds from start, as listed above)
- duration: number (as listed above)
- prompt: string (detailed AI video generation prompt, 50-100 words${hasLyrics ? ", visually reflecting the lyrics for that scene" : ""})
- visualStyle: string (e.g. "cinematic", "dark neon", "ethereal", "gritty realism", "anime", "oil painting")

Make the scenes tell a visual story that matches the theme. Vary the camera angles, settings, and visual styles to keep it dynamic.`;

  const response = await invokeLLM({
    messages: [
      { role: "system" as const, content: systemPrompt as string },
      { role: "user" as const, content: userPrompt as string },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "storyboard",
        strict: true,
        schema: {
          type: "object",
          properties: {
            scenes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sceneIndex: { type: "integer" },
                  startTime: { type: "integer" },
                  duration: { type: "integer" },
                  prompt: { type: "string" },
                  visualStyle: { type: "string" },
                },
                required: ["sceneIndex", "startTime", "duration", "prompt", "visualStyle"],
                additionalProperties: false,
              },
            },
          },
          required: ["scenes"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) throw new Error("LLM returned empty response");
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  const parsed = JSON.parse(content);

  // Merge the lyrics back into each scene result
  return parsed.scenes.map((scene: any) => ({
    ...scene,
    lyrics: sceneWindows[scene.sceneIndex]?.lyrics ?? "",
  }));
}

/**
 * Start rendering a single scene via Kling AI.
 * Returns the task ID for polling.
 * @param lipSync - If true, append a lip-sync hint to the prompt (for music-driven scenes).
 */
/** Prompt modifiers for each lip-sync style */
const LIP_SYNC_STYLE_PROMPTS: Record<string, string> = {
  natural: "Characters sing naturally with realistic, subtle mouth movements synced to the music.",
  expressive: "Characters sing with highly expressive, exaggerated mouth movements and energetic facial animation synced to the music.",
  subtle: "Characters sing with very subtle, minimal mouth movements, almost imperceptible, softly synced to the music.",
  dramatic: "Characters sing with dramatic, theatrical mouth movements and intense emotional facial expressions synced to the music.",
  anime: "Anime-style lip sync: stylized, exaggerated mouth flaps with wide open/close movements, expressive eyes, and vibrant character animation in the style of Japanese animation.",
};

/**
 * Estimate the render cost (GBP) for a set of scenes under a given renderer assignment.
 */
export function estimateRenderCost(
  sceneCount: number,
  premiumScenes: number
): number {
  const standardScenes = Math.max(0, sceneCount - premiumScenes);
  return (
    premiumScenes * RENDERER_COSTS.kling_standard +
    standardScenes * RENDERER_COSTS.seedance
  );
}

export async function startSceneRender(
  sceneId: number,
  prompt: string,
  duration: number,
  lipSync = true,
  lipSyncStyle: "natural" | "expressive" | "subtle" | "dramatic" | "anime" = "natural",
  renderer: RendererType = "fal_seedance"
): Promise<string> {
  // Append lip-sync guidance to the prompt based on the per-scene setting
  const finalPrompt = lipSync
    ? `${prompt} ${LIP_SYNC_STYLE_PROMPTS[lipSyncStyle] ?? LIP_SYNC_STYLE_PROMPTS.natural}`
    : `${prompt} Cinematic movement only, no singing, no mouth animation.`;

  // Route to the appropriate renderer
  if (renderer === "fal_seedance") {
    return startSceneRenderFalSeedance(sceneId, finalPrompt, duration);
  }

  if (renderer === "seedance") {
    return startSceneRenderSeedance(sceneId, finalPrompt, duration);
  }

  // Premium renderers (kling_standard, kling_pro, runway) — with single retry + fal_seedance fallback
  try {
    const taskId = await startSceneRenderKling(finalPrompt, duration);
    console.log(`[MusicVideo] Scene ${sceneId} → Kling (${renderer}) taskId=${taskId}`);
    return taskId;
  } catch (err) {
    console.warn(`[MusicVideo] Scene ${sceneId} Kling failed, falling back to fal.ai Seedance:`, err);
    return startSceneRenderFalSeedance(sceneId, finalPrompt, duration);
  }
}

async function startSceneRenderKling(prompt: string, duration: number): Promise<string> {
  const taskId = await klingClient.createTextToVideo({
    prompt,
    duration: duration <= 5 ? "5" : "10",
    aspect_ratio: "16:9",
    mode: "standard",
  });
  if (!taskId) throw new Error("Kling: no task_id returned");
  return taskId;
}

async function startSceneRenderFalSeedance(sceneId: number, prompt: string, duration: number): Promise<string> {
  const requestId = await submitFalSeedanceVideo({
    prompt,
    aspect_ratio: "16:9",
    duration: duration <= 5 ? "5" : "8",
    resolution: "720p",
    generate_audio: false, // music video — audio comes from the track
  });
  if (!requestId) throw new Error(`fal.ai Seedance: no request_id returned for scene ${sceneId}`);
  console.log(`[MusicVideo] Scene ${sceneId} → fal.ai Seedance requestId=${requestId}`);
  // Prefix the ID so pollSceneStatus knows which API to poll
  return `${FAL_REQUEST_ID_PREFIX}${requestId}`;
}

async function startSceneRenderSeedance(sceneId: number, prompt: string, duration: number): Promise<string> {
  const taskId = await seedanceClient.createTextToVideo({
    prompt,
    duration: duration <= 5 ? 5 : 10,
    aspect_ratio: "16:9",
  });
  if (!taskId) throw new Error(`Seedance: no task_id returned for scene ${sceneId}`);
  return taskId;
}

/**
 * Poll a fal.ai Seedance scene and update DB when complete.
 */
async function pollSceneStatusFalSeedance(
  sceneId: number,
  requestId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  try {
    const result = await pollFalSeedanceVideo(requestId);
    if (!result) return { status: "processing" };

    // Download and re-upload to S3 for permanent storage
    let buffer: Buffer | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(result.videoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      } catch (fetchErr) {
        console.warn(`[FalSeedance] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!buffer) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Failed to download fal.ai video after 3 attempts", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
    const { url } = await storagePut(key, buffer, "video/mp4");

    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }

    return { status: "completed", videoUrl: url };
  } catch (err: any) {
    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(err?.message ?? err), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }
}

/**
 * Poll a scene's render status and update DB when complete.
 * Returns the video URL if completed, null if still processing.
 */
export async function pollSceneStatus(
  sceneId: number,
  taskId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  // Route to the correct API based on the task ID prefix
  if (taskId.startsWith(FAL_REQUEST_ID_PREFIX)) {
    return pollSceneStatusFalSeedance(sceneId, taskId.slice(FAL_REQUEST_ID_PREFIX.length));
  }

  // Legacy: Volcengine Seedance task IDs are handled by klingClient (wrong but kept for backward compat)
  // Kling task IDs are UUIDs without the fal: prefix
  const result = await klingClient.getTaskStatus(taskId);

  if (!result) return { status: "processing" };

  const taskStatus = result.task_status;

  // Kling API uses "succeed" as the success status
  if (taskStatus === "succeed") {
    const videoUrl = (result as any).task_result?.videos?.[0]?.url;
    if (!videoUrl) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Video generation succeeded but no video URL returned", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    // Download with retry (up to 3 attempts) in case of transient CDN errors
    let buffer: Buffer | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = Buffer.from(await response.arrayBuffer());
        break;
      } catch (fetchErr) {
        console.warn(`[MusicVideo] Scene ${sceneId} video download attempt ${attempt}/3 failed:`, fetchErr);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }

    if (!buffer) {
      const db2 = await getDb();
      if (db2) {
        await db2.update(musicVideoScenes)
          .set({ status: "failed", errorMessage: "Failed to download completed scene video after 3 attempts", updatedAt: new Date() })
          .where(eq(musicVideoScenes.id, sceneId));
      }
      return { status: "failed" };
    }

    const key = `music-video-scenes/${sceneId}-${Date.now()}.mp4`;
    const { url } = await storagePut(key, buffer, "video/mp4");

    const db2 = await getDb();
    if (db2) {
      await db2.update(musicVideoScenes)
        .set({ status: "completed", videoUrl: url, videoKey: key, updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }

    return { status: "completed", videoUrl: url };
  }

  if (taskStatus === "failed") {
    // Extract Kling's actual failure reason if available
    const failReason = (result as any).task_result?.fail_reason
      ?? (result as any).fail_reason
      ?? "Video generation failed";
    const db3 = await getDb();
    if (db3) {
      await db3.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: String(failReason), updatedAt: new Date() })
        .where(eq(musicVideoScenes.id, sceneId));
    }
    return { status: "failed" };
  }

  return { status: "processing" };
}

/**
 * Assemble all scene videos + audio into a final music video using ffmpeg.
 * Returns the S3 URL of the final video.
 */
export async function assembleMusicVideo(jobId: number): Promise<string> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database not available");

  const [job] = await dbConn.select().from(musicVideoJobs).where(eq(musicVideoJobs.id, jobId));
  if (!job) throw new Error(`Job ${jobId} not found`);

  const scenes = await dbConn.select()
    .from(musicVideoScenes)
    .where(and(eq(musicVideoScenes.jobId, jobId), eq(musicVideoScenes.status, "completed")));

  if (scenes.length === 0) throw new Error("No completed scenes to assemble");

  scenes.sort((a, b) => a.sceneIndex - b.sceneIndex);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `wizvid-job-${jobId}-`));

  try {
    const sceneFiles: string[] = [];
    for (const scene of scenes) {
      if (!scene.videoUrl) continue;
      const sceneFile = path.join(tmpDir, `scene-${scene.sceneIndex.toString().padStart(3, "0")}.mp4`);
      const resp = await fetch(scene.videoUrl);
      const buf = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(sceneFile, buf);
      sceneFiles.push(sceneFile);
    }

    const audioFile = path.join(tmpDir, "audio.mp3");
    const audioResp = await fetch(job.audioUrl);
    const audioBuf = Buffer.from(await audioResp.arrayBuffer());
    fs.writeFileSync(audioFile, audioBuf);

    const concatFile = path.join(tmpDir, "concat.txt");
    const concatContent = sceneFiles.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync(concatFile, concatContent);

    // Concatenate all video clips
    const concatenatedVideo = path.join(tmpDir, "concatenated.mp4");
     await execAsync(
      `ffmpeg -y -f concat -safe 0 -i "${concatFile}" -c:v libx264 -preset fast -crf 22 "${concatenatedVideo}"`,
      { timeout: 600000 } // 10 min — long videos with many scenes need more time
    );
    // Mix video with audio — trim to exact audio duration
    const finalVideo = path.join(tmpDir, "final.mp4");
    await execAsync(
      `ffmpeg -y -i "${concatenatedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${finalVideo}"`,
      { timeout: 600000 } // 10 min
    );

    const finalBuffer = fs.readFileSync(finalVideo);
    const finalKey = `music-videos/job-${jobId}-final-${Date.now()}.mp4`;
    const { url } = await storagePut(finalKey, finalBuffer, "video/mp4");

    await dbConn.update(musicVideoJobs)
      .set({ status: "completed", finalVideoUrl: url, finalVideoKey: finalKey, updatedAt: new Date() })
      .where(eq(musicVideoJobs.id, jobId));

    return url;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
