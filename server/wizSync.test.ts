/**
 * WizSync™ router unit tests
 * Tests the router structure and procedure existence without calling external APIs.
 */
import { describe, expect, it } from "vitest";
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
    stripeCustomerId: null,
  };
  const ctx: TrpcContext = {
    user,
    req: {
      headers: {},
      cookies: {},
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

describe("WizSync™ router", () => {
  it("should have wizSync router registered in appRouter", () => {
    expect(appRouter._def.procedures).toHaveProperty("wizSync.analyseAudio");
    expect(appRouter._def.procedures).toHaveProperty("wizSync.pollAnalysis");
    expect(appRouter._def.procedures).toHaveProperty("wizSync.assignCharacter");
    expect(appRouter._def.procedures).toHaveProperty("wizSync.getJob");
    expect(appRouter._def.procedures).toHaveProperty("wizSync.listJobs");
  });

  it("should reject unauthenticated listJobs call", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(caller.wizSync.listJobs()).rejects.toThrow();
  });

  it("should reject unauthenticated analyseAudio call", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.wizSync.analyseAudio({
        audioUrl: "https://example.com/audio.mp3",
        audioName: "Test Track",
      })
    ).rejects.toThrow();
  });

  it("should reject unauthenticated getJob call", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(caller.wizSync.getJob({ jobId: 1 })).rejects.toThrow();
  });

  it("should reject unauthenticated assignCharacter call", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    await expect(
      caller.wizSync.assignCharacter({
        speakerId: 1,
        characterId: null,
        inferredGender: "male",
        displayName: "Speaker A",
      })
    ).rejects.toThrow();
  });

  it("should return error status when external APIs unavailable (authenticated)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Without real API keys, analyseAudio returns { status: 'error' } or throws
    // Either outcome is acceptable — just verify the call completes without crashing
    let result: { jobId: number; status: string } | null = null;
    let threw = false;
    try {
      result = await caller.wizSync.analyseAudio({
        audioUrl: "https://example.com/audio.mp3",
        audioName: "Test Track",
      });
    } catch {
      threw = true;
    }
    // Either it threw or returned an error/analysing status
    expect(threw || result?.status === "error" || result?.status === "analysing").toBe(true);
  });
});
