/**
 * Voice transcription router tests
 * Tests the transcribeAndRefine procedure for error handling and quota guard
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// Mock the transcribeAudio helper
vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn(),
}));

// Mock the invokeLLM helper
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the quotaError helper
vi.mock("./_core/quotaError", () => ({
  withQuotaGuard: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  QUOTA_EXHAUSTED_MESSAGE: "Service quota exhausted. Please try again later.",
}));

import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { withQuotaGuard } from "./_core/quotaError";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    stripeCustomerId: null,
  };
  return {
    user,
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as any,
  };
}

describe("voice.transcribeAndRefine", () => {
  const caller = appRouter.createCaller(createAuthContext());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns refined prompt on success", async () => {
    vi.mocked(transcribeAudio).mockResolvedValue({
      task: "transcribe",
      language: "en",
      duration: 3.0,
      text: "I want a chill lo-fi hip hop beat with rain sounds",
      segments: [],
    });

    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        {
          message: {
            content: "Chill lo-fi hip hop beat with rain sounds, relaxed tempo, atmospheric",
          },
        },
      ],
    } as any);

    const result = await caller.voice.transcribeAndRefine({
      audioUrl: "https://example.com/audio.mp3",
      toolContext: "AI music and song creation",
    });

    expect(result.rawTranscript).toBe("I want a chill lo-fi hip hop beat with rain sounds");
    expect(result.refinedPrompt).toBe(
      "Chill lo-fi hip hop beat with rain sounds, relaxed tempo, atmospheric"
    );
  });

  it("throws INTERNAL_SERVER_ERROR when transcription fails", async () => {
    vi.mocked(transcribeAudio).mockResolvedValue({
      error: "Transcription service request failed",
      code: "TRANSCRIPTION_FAILED",
      details: "500 Internal Server Error",
    });

    await expect(
      caller.voice.transcribeAndRefine({
        audioUrl: "https://example.com/audio.mp3",
        toolContext: "AI music and song creation",
      })
    ).rejects.toThrow(TRPCError);
  });

  it("throws BAD_REQUEST when audio file is too large", async () => {
    vi.mocked(transcribeAudio).mockResolvedValue({
      error: "Audio file exceeds maximum size limit",
      code: "FILE_TOO_LARGE",
      details: "File size is 20MB, maximum allowed is 16MB",
    });

    await expect(
      caller.voice.transcribeAndRefine({
        audioUrl: "https://example.com/large-audio.mp3",
        toolContext: "AI music and song creation",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("calls withQuotaGuard to protect against quota errors", async () => {
    vi.mocked(transcribeAudio).mockResolvedValue({
      task: "transcribe",
      language: "en",
      duration: 1.0,
      text: "test",
      segments: [],
    });

    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "test refined" } }],
    } as any);

    await caller.voice.transcribeAndRefine({
      audioUrl: "https://example.com/audio.mp3",
      toolContext: "AI music and song creation",
    });

    expect(withQuotaGuard).toHaveBeenCalledOnce();
  });

  it("returns raw transcript when LLM refinement fails", async () => {
    vi.mocked(transcribeAudio).mockResolvedValue({
      task: "transcribe",
      language: "en",
      duration: 2.0,
      text: "A dark cinematic score with strings",
      segments: [],
    });

    // LLM throws an error
    vi.mocked(invokeLLM).mockRejectedValue(new Error("LLM unavailable"));

    const result = await caller.voice.transcribeAndRefine({
      audioUrl: "https://example.com/audio.mp3",
      toolContext: "AI music and song creation",
    });

    // Should fall back to raw transcript
    expect(result.rawTranscript).toBe("A dark cinematic score with strings");
    expect(result.refinedPrompt).toBe("A dark cinematic score with strings");
  });
});
