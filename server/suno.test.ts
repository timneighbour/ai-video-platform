/**
 * Suno API key validation test.
 * Verifies the key is present and the client initialises without throwing.
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
});
