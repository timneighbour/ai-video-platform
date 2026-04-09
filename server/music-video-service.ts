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

const klingClient = initKlingAI();

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
  lyricsSegments?: Array<{ start: number; end: number; text: string }>
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

  const systemPrompt = `You are a professional music video director and creative director. 
Your job is to create detailed, cinematic scene descriptions for AI video generation.
Each scene description must be:
- Highly visual and specific (describe lighting, camera angle, movement, subjects, atmosphere)
- Consistent with the overall theme and mood
${hasLyrics ? "- Visually inspired by the lyrics being sung in that scene — the imagery should reflect the words and emotions" : ""}
- Optimised for AI video generation (clear, vivid, no abstract concepts)
- Varied enough to create an interesting visual journey
- Between 50-100 words each

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
 */
export async function startSceneRender(
  sceneId: number,
  prompt: string,
  duration: number
): Promise<string> {
  const taskId = await klingClient.createTextToVideo({
    prompt,
    duration: duration <= 5 ? "5" : "10",
    aspect_ratio: "16:9",
    mode: "standard",
  });

  if (!taskId) {
    throw new Error("Failed to start video generation: no task_id returned");
  }

  return taskId;
}

/**
 * Poll a scene's render status and update DB when complete.
 * Returns the video URL if completed, null if still processing.
 */
export async function pollSceneStatus(
  sceneId: number,
  taskId: string
): Promise<{ status: "completed" | "failed" | "processing"; videoUrl?: string }> {
  const result = await klingClient.getTaskStatus(taskId);

  if (!result) return { status: "processing" };

  const taskStatus = result.task_status;

  if (taskStatus === "succeed") {
    const videoUrl = (result as any).task_result?.videos?.[0]?.url;
    if (!videoUrl) return { status: "failed" };

    const response = await fetch(videoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
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
    const db3 = await getDb();
    if (db3) {
      await db3.update(musicVideoScenes)
        .set({ status: "failed", errorMessage: "Video generation failed", updatedAt: new Date() })
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
      { timeout: 300000 }
    );

    // Mix video with audio — trim to exact audio duration
    const finalVideo = path.join(tmpDir, "final.mp4");
    await execAsync(
      `ffmpeg -y -i "${concatenatedVideo}" -i "${audioFile}" -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest "${finalVideo}"`,
      { timeout: 300000 }
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
