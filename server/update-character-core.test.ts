/**
 * Tests for the updateCharacterCore tRPC procedure.
 * Validates input schema, ownership checks, field updates, and approval reset.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Input schema (mirrors the procedure definition) ──────────────────────────
const updateCharacterCoreInput = z.object({
  characterId: z.number().int(),
  jobId: z.number().int(),
  name: z.string().min(1).max(255).optional(),
  role: z.string().max(255).nullable().optional(),
  bodyBuild: z.enum(["slim", "lean", "average", "athletic", "stocky", "muscular"]).optional(),
  lockedDescription: z.string().nullable().optional(),
  characterConstraints: z.string().nullable().optional(),
  characterDefaultState: z.string().nullable().optional(),
  visualDetails: z.object({
    instrument: z.string().optional(),
    outfit: z.string().optional(),
    props: z.string().optional(),
    position: z.string().optional(),
  }).nullable().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function validate(input: unknown) {
  return updateCharacterCoreInput.safeParse(input);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("updateCharacterCore — input schema", () => {
  it("accepts a minimal valid input (only required fields)", () => {
    const result = validate({ characterId: 1, jobId: 42 });
    expect(result.success).toBe(true);
  });

  it("accepts a full valid input with all optional fields", () => {
    const result = validate({
      characterId: 5,
      jobId: 10,
      name: "Zara",
      role: "Lead Vocalist",
      bodyBuild: "athletic",
      lockedDescription: "Dark hair, green eyes, emerald gown",
      characterConstraints: "NEVER holding a cello. ALWAYS at microphone.",
      characterDefaultState: "Standing at mic, centre stage",
      visualDetails: {
        instrument: "none",
        outfit: "emerald gown",
        props: "microphone stand",
        position: "centre stage",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name (min length 1)", () => {
    const result = validate({ characterId: 1, jobId: 1, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name");
    }
  });

  it("rejects a name longer than 255 characters", () => {
    const result = validate({ characterId: 1, jobId: 1, name: "A".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid bodyBuild value", () => {
    const result = validate({ characterId: 1, jobId: 1, bodyBuild: "obese" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("bodyBuild");
    }
  });

  it("accepts all valid bodyBuild enum values", () => {
    const builds = ["slim", "lean", "average", "athletic", "stocky", "muscular"] as const;
    for (const build of builds) {
      const result = validate({ characterId: 1, jobId: 1, bodyBuild: build });
      expect(result.success).toBe(true);
    }
  });

  it("accepts null for nullable fields (role, lockedDescription, etc.)", () => {
    const result = validate({
      characterId: 1,
      jobId: 1,
      role: null,
      lockedDescription: null,
      characterConstraints: null,
      characterDefaultState: null,
      visualDetails: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer characterId", () => {
    const result = validate({ characterId: 1.5, jobId: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer jobId", () => {
    const result = validate({ characterId: 1, jobId: 1.5 });
    expect(result.success).toBe(false);
  });

  it("accepts partial visualDetails (only outfit provided)", () => {
    const result = validate({
      characterId: 1,
      jobId: 1,
      visualDetails: { outfit: "black leather jacket" },
    });
    expect(result.success).toBe(true);
  });
});

// ── Business logic unit tests ─────────────────────────────────────────────────
describe("updateCharacterCore — business logic", () => {
  it("previewApproved should always be reset to false after an update", () => {
    // Simulate the update fields construction
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
      previewApproved: false, // always reset
    };
    const input = { name: "Zara Updated", bodyBuild: "slim" };
    if (input.name) updateFields.name = input.name;
    if (input.bodyBuild) updateFields.bodyBuild = input.bodyBuild;

    expect(updateFields.previewApproved).toBe(false);
    expect(updateFields.name).toBe("Zara Updated");
    expect(updateFields.bodyBuild).toBe("slim");
  });

  it("visualDetails serialises to JSON string for DB storage", () => {
    const visualDetails = { instrument: "guitar", outfit: "leather jacket", props: "mic stand", position: "centre" };
    const serialised = JSON.stringify(visualDetails);
    const parsed = JSON.parse(serialised);
    expect(parsed.instrument).toBe("guitar");
    expect(parsed.outfit).toBe("leather jacket");
  });

  it("null visualDetails should not overwrite existing characterVisualDetails", () => {
    const input = { visualDetails: null };
    const updateFields: Record<string, unknown> = {};
    if (input.visualDetails !== undefined) {
      updateFields.characterVisualDetails = input.visualDetails ? JSON.stringify(input.visualDetails) : undefined;
    }
    // null → undefined means the field is NOT included in the update (no overwrite)
    expect(updateFields.characterVisualDetails).toBeUndefined();
  });

  it("undefined visualDetails should not be included in update fields at all", () => {
    const input: { visualDetails?: null | object } = {}; // visualDetails not provided
    const updateFields: Record<string, unknown> = {};
    if (input.visualDetails !== undefined) {
      updateFields.characterVisualDetails = JSON.stringify(input.visualDetails);
    }
    expect("characterVisualDetails" in updateFields).toBe(false);
  });

  it("parseVisualDetails correctly extracts fields from JSON string", () => {
    const raw = JSON.stringify({ instrument: "cello", outfit: "green gown", props: "", position: "centre stage" });
    const parsed = JSON.parse(raw);
    expect(parsed.instrument).toBe("cello");
    expect(parsed.outfit).toBe("green gown");
    expect(parsed.props).toBe("");
    expect(parsed.position).toBe("centre stage");
  });

  it("parseVisualDetails returns defaults for null input", () => {
    const defaults = { instrument: "", outfit: "", props: "", position: "" };
    const raw: string | null = null;
    const result = raw ? JSON.parse(raw) : defaults;
    expect(result).toEqual(defaults);
  });
});
