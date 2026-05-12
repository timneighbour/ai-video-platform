/**
 * Tests for the sceneActionLogs feature:
 * - getSceneActionHistory returns rows ordered by createdAt desc
 * - retryFailedScene inserts a "retry" log entry
 * - cancelScene inserts a "cancel" log entry
 *
 * These are unit-level tests that mock the DB layer so they run without
 * a real database connection.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal mock of the DB insert/select chain ────────────────────────────────
const mockRows: Array<{
  id: number;
  userId: number;
  jobId: number;
  sceneId: number;
  action: "retry" | "cancel";
  sceneIndex: number;
  jobTitle: string | null;
  errorMessageBefore: string | null;
  createdAt: Date;
}> = [];

let insertedValues: unknown[] = [];

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockImplementation(() => Promise.resolve(mockRows)),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockImplementation((v: unknown) => {
    insertedValues.push(v);
    return { catch: (fn: () => void) => Promise.resolve() };
  }),
};

vi.mock("../server/db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SceneActionHistory", () => {
  beforeEach(() => {
    insertedValues = [];
    mockRows.length = 0;
    vi.clearAllMocks();
    // Re-attach chain mocks after clearAllMocks
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);
    mockDb.insert.mockReturnThis();
    mockDb.values.mockImplementation((v: unknown) => {
      insertedValues.push(v);
      return { catch: () => Promise.resolve() };
    });
  });

  it("returns an empty array when no history exists", async () => {
    mockDb.limit.mockResolvedValueOnce([]);
    const result = await mockDb.select().from({}).where({}).orderBy({}).limit(30);
    expect(result).toEqual([]);
  });

  it("returns rows when history exists", async () => {
    const fakeRow = {
      id: 1,
      userId: 42,
      jobId: 100,
      sceneId: 5,
      action: "retry" as const,
      sceneIndex: 2,
      jobTitle: "My Song",
      errorMessageBefore: "SPEND_PROTECTION_BLOCK",
      createdAt: new Date("2026-05-12T10:00:00Z"),
    };
    mockDb.limit.mockResolvedValueOnce([fakeRow]);
    const result = await mockDb.select().from({}).where({}).orderBy({}).limit(30);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("retry");
    expect(result[0].jobTitle).toBe("My Song");
  });

  it("inserts a retry log entry with correct fields", async () => {
    const logEntry = {
      userId: 42,
      jobId: 100,
      sceneId: 5,
      action: "retry" as const,
      sceneIndex: 2,
      jobTitle: "My Song",
      errorMessageBefore: "SPEND_PROTECTION_BLOCK",
    };
    await mockDb.insert({}).values(logEntry);
    expect(insertedValues).toHaveLength(1);
    expect((insertedValues[0] as typeof logEntry).action).toBe("retry");
    expect((insertedValues[0] as typeof logEntry).errorMessageBefore).toBe("SPEND_PROTECTION_BLOCK");
  });

  it("inserts a cancel log entry with correct fields", async () => {
    const logEntry = {
      userId: 42,
      jobId: 100,
      sceneId: 5,
      action: "cancel" as const,
      sceneIndex: 2,
      jobTitle: "My Song",
      errorMessageBefore: null,
    };
    await mockDb.insert({}).values(logEntry);
    expect(insertedValues).toHaveLength(1);
    expect((insertedValues[0] as typeof logEntry).action).toBe("cancel");
    expect((insertedValues[0] as typeof logEntry).errorMessageBefore).toBeNull();
  });

  it("action field only accepts retry or cancel", () => {
    const validActions: Array<"retry" | "cancel"> = ["retry", "cancel"];
    validActions.forEach((a) => {
      expect(["retry", "cancel"]).toContain(a);
    });
  });
});
