import { describe, it, expect } from "vitest";

// Mirror the server-side state parsing logic from server/_core/oauth.ts
function parseReturnPath(state: string): string {
  let postLoginPath = "/";
  try {
    const decoded = Buffer.from(state, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (parsed.returnPath && typeof parsed.returnPath === "string" && parsed.returnPath.startsWith("/")) {
      postLoginPath = parsed.returnPath;
    }
  } catch {
    // Legacy state format — just redirect to home
  }
  return postLoginPath;
}

// Mirror the client-side getLoginUrl state encoding from client/src/const.ts
function encodeState(redirectUri: string, returnPath?: string): string {
  const statePayload = JSON.stringify({ redirectUri, returnPath: returnPath || "/" });
  return Buffer.from(statePayload).toString("base64");
}

describe("OAuth returnPath state encoding/decoding", () => {
  it("returns / when no returnPath provided", () => {
    const state = encodeState("https://wiz-ai.io/api/oauth/callback");
    expect(parseReturnPath(state)).toBe("/");
  });

  it("returns /kids-video when returnPath is /kids-video (WizAnimate studio)", () => {
    const state = encodeState("https://wiz-ai.io/api/oauth/callback", "/kids-video");
    expect(parseReturnPath(state)).toBe("/kids-video");
  });

  it("returns /music-video/create when returnPath is /music-video/create", () => {
    const state = encodeState("https://wiz-ai.io/api/oauth/callback", "/music-video/create");
    expect(parseReturnPath(state)).toBe("/music-video/create");
  });

  it("returns /text-to-video when returnPath is /text-to-video", () => {
    const state = encodeState("https://wiz-ai.io/api/oauth/callback", "/text-to-video");
    expect(parseReturnPath(state)).toBe("/text-to-video");
  });

  it("rejects absolute URL as returnPath (security check)", () => {
    const state = encodeState("https://wiz-ai.io/api/oauth/callback", "https://evil.com");
    expect(parseReturnPath(state)).toBe("/");
  });

  it("handles legacy non-JSON base64 state gracefully (backward compat)", () => {
    const legacyState = Buffer.from("https://wiz-ai.io/api/oauth/callback").toString("base64");
    expect(parseReturnPath(legacyState)).toBe("/");
  });

  it("handles completely malformed state gracefully", () => {
    expect(parseReturnPath("not-valid-base64!!!")).toBe("/");
  });

  it("AiAnimationMaker: state encodes /kids-video as destination correctly", () => {
    const WIZANIMATE_STUDIO_PAGE = "/kids-video";
    const state = encodeState("https://wiz-ai.io/api/oauth/callback", WIZANIMATE_STUDIO_PAGE);
    expect(parseReturnPath(state)).toBe("/kids-video");
  });
});
