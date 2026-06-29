/**
 * Audio Proxy — server/_core/audioProxy.ts
 *
 * Provides two Express routes that proxy Suno/ElevenLabs CDN audio through
 * the server so the raw provider URL is NEVER sent to the client.
 *
 *   GET /api/audio/stream/:token   — 1-hour stream token used as <audio> src
 *   GET /api/audio/download/:token — 15-min download token returned by downloadSong
 *
 * Both tokens are HS256 JWTs signed with JWT_SECRET (ENV.cookieSecret).
 */

import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

// ── Token lifetimes ──────────────────────────────────────────────────────────
const STREAM_TOKEN_TTL_MS   = 60 * 60 * 1000;   // 1 hour  — for <audio> src
const DOWNLOAD_TOKEN_TTL_MS = 15 * 60 * 1000;   // 15 min  — for one-shot download

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSecret(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function signStreamToken(payload: {
  audioUrl: string;
  userId: number;
  taskId: number;
  trackIndex: number;
}): Promise<string> {
  return new SignJWT({ ...payload, type: "stream" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor((Date.now() + STREAM_TOKEN_TTL_MS) / 1000))
    .sign(getSecret());
}

export async function signDownloadToken(payload: {
  audioUrl: string;
  userId: number;
  taskId: number;
  trackIndex: number;
  title: string;
}): Promise<string> {
  return new SignJWT({ ...payload, type: "download" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor((Date.now() + DOWNLOAD_TOKEN_TTL_MS) / 1000))
    .sign(getSecret());
}

async function verifyAudioToken(
  token: string,
  expectedType: "stream" | "download"
): Promise<{ audioUrl: string; userId: number; taskId: number; trackIndex: number; title?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (payload.type !== expectedType) return null;
    const { audioUrl, userId, taskId, trackIndex, title } = payload as Record<string, unknown>;
    if (typeof audioUrl !== "string" || typeof userId !== "number") return null;
    return {
      audioUrl,
      userId: userId as number,
      taskId: taskId as number,
      trackIndex: trackIndex as number,
      title: typeof title === "string" ? title : undefined,
    };
  } catch {
    return null;
  }
}

// ── Proxy helper — pipes a remote URL through the response ───────────────────
async function proxyAudio(
  remoteUrl: string,
  req: Request,
  res: Response,
  disposition: "inline" | "attachment",
  filename?: string
): Promise<void> {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "WizAI-AudioProxy/1.0",
    };
    // Forward Range header for partial content / seek support
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const upstream = await fetch(remoteUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      res.status(502).send("Audio source unavailable");
      return;
    }

    const contentType    = upstream.headers.get("content-type")    || "audio/mpeg";
    const contentLength  = upstream.headers.get("content-length");
    const contentRange   = upstream.headers.get("content-range");
    const acceptRanges   = upstream.headers.get("accept-ranges");

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange)  res.setHeader("Content-Range",  contentRange);
    if (acceptRanges)  res.setHeader("Accept-Ranges",  acceptRanges);

    const safeFilename = (filename ?? "track")
      .replace(/[^a-zA-Z0-9 _\-().]/g, "")
      .trim() || "track";

    res.setHeader(
      "Content-Disposition",
      disposition === "attachment"
        ? `attachment; filename="${safeFilename}.mp3"`
        : `inline; filename="${safeFilename}.mp3"`
    );

    if (!upstream.body) { res.end(); return; }

    // Stream body to client
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.writableEnded) res.write(value);
    }
    if (!res.writableEnded) res.end();
  } catch (err: any) {
    console.error("[AudioProxy] Proxy error:", err.message);
    if (!res.headersSent) res.status(502).send("Audio proxy error");
  }
}

// ── Route registration ───────────────────────────────────────────────────────
export function registerAudioProxy(app: Express): void {
  /**
   * Stream endpoint — used as the <audio> src.
   * 1-hour token. Returns audio with inline disposition so the browser plays it
   * but the underlying URL is never exposed to the client.
   */
  app.get("/api/audio/stream/:token", async (req: Request, res: Response) => {
    const payload = await verifyAudioToken(req.params.token, "stream");
    if (!payload) {
      res.status(401).send("Invalid or expired stream token");
      return;
    }
    await proxyAudio(payload.audioUrl, req, res, "inline", payload.title);
  });

  /**
   * Download endpoint — used for the Download button after credits are charged.
   * 15-minute token. Returns audio with attachment disposition.
   */
  app.get("/api/audio/download/:token", async (req: Request, res: Response) => {
    const payload = await verifyAudioToken(req.params.token, "download");
    if (!payload) {
      res.status(401).send("Invalid or expired download token");
      return;
    }
    await proxyAudio(payload.audioUrl, req, res, "attachment", payload.title);
  });
}
