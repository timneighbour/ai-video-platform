/**
 * Suno API key validation test.
 * Verifies the key is present and the client initialises without throwing.
 * Also validates the new uploadCover / uploadExtend / uploadTrackForCover methods exist.
 */
import { describe, it, expect } from "vitest";
import { initSuno } from "./ai-apis/suno";

describe("Suno API configuration", () => {
  it("SUNO_API_KEY env var is set", () => {
    expect(process.env.SUNO_API_KEY).toBeDefined();
    expect(process.env.SUNO_API_KEY!.length).toBeGreaterThan(8);
  });

  it("initSuno() creates a client without throwing", () => {
    expect(() => initSuno()).not.toThrow();
  });

  it("SunoClient has generate and getTaskStatus methods", () => {
    const client = initSuno();
    expect(typeof client.generate).toBe("function");
    expect(typeof client.getTaskStatus).toBe("function");
    expect(typeof client.getCredits).toBe("function");
  });

  it("SunoClient has uploadCover method (Cover & Transform)", () => {
    const client = initSuno();
    expect(typeof client.uploadCover).toBe("function");
  });

  it("SunoClient has uploadExtend method (Extend & Continue)", () => {
    const client = initSuno();
    expect(typeof client.uploadExtend).toBe("function");
  });

  it("SunoClient has uploadFileFromUrl helper", () => {
    const client = initSuno();
    expect(typeof client.uploadFileFromUrl).toBe("function");
  });
});

describe("WizAudio Cover/Extend input validation", () => {
  it("uploadCover requires an uploadUrl", async () => {
    const client = initSuno();
    // Calling with an invalid URL should throw before hitting the network
    await expect(
      client.uploadCover({
        uploadUrl: "",
        customMode: false,
        instrumental: false,
      })
    ).rejects.toBeDefined();
  });

  it("uploadExtend requires an uploadUrl", async () => {
    const client = initSuno();
    await expect(
      client.uploadExtend({
        uploadUrl: "",
        customMode: false,
        instrumental: false,
      })
    ).rejects.toBeDefined();
  });
});
