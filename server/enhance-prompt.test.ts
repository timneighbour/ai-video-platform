import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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
  };
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

// Mock the LLM module so we don't make real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            "A lone astronaut drifts through a vast neon galaxy, their silver suit reflecting prismatic light from distant nebulae. The camera slowly orbits around them as they reach out toward a glowing orb of warm amber light — home. Deep purple and electric blue tones dominate the frame, punctuated by streaks of magenta from passing comets.",
        },
      },
    ],
  }),
}));

describe("musicVideo.enhancePrompt", () => {
  it("returns an enhanced prompt from the LLM", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.musicVideo.enhancePrompt({
      prompt: "astronaut in space looking for home, neon galaxy",
      genre: "Indie Rock",
      mood: "Melancholic",
    });

    expect(result).toBeDefined();
    expect(result.enhanced).toBeDefined();
    expect(typeof result.enhanced).toBe("string");
    expect(result.enhanced.length).toBeGreaterThan(10);
  });

  it("returns original prompt when LLM returns empty", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.musicVideo.enhancePrompt({
      prompt: "my original prompt",
    });

    // Should fall back to original prompt when LLM returns empty
    expect(result.enhanced).toBe("my original prompt");
  });

  it("works without genre and mood", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.musicVideo.enhancePrompt({
      prompt: "a cat walking on a rainbow bridge",
    });

    expect(result).toBeDefined();
    expect(result.enhanced).toBeDefined();
    expect(typeof result.enhanced).toBe("string");
  });

  it("rejects prompts that are too short", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.musicVideo.enhancePrompt({ prompt: "ab" })
    ).rejects.toThrow();
  });
});
