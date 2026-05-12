/**
 * Tests for stuckSceneReaper handler logic.
 * Uses mocked DB and mocked startSceneRender to avoid real network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockStuckScenes: unknown[] = [];
const mockAttemptCounts: unknown[] = [];
let updatedRows: unknown[] = [];
let insertedLogs: unknown[] = [];

const mockDb = {
  _updateTarget: null as string | null,
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockImplementation(() => Promise.resolve(mockAttemptCounts)),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockImplementation((v: unknown) => {
    insertedLogs.push(v);
    return { catch: () => Promise.resolve() };
  }),
};

// Make select().from().where() resolve to mockStuckScenes by default
mockDb.where.mockImplementation(() => ({
  ...mockDb,
  groupBy: () => Promise.resolve(mockAttemptCounts),
  then: (resolve: (v: unknown) => void) => resolve(mockStuckScenes),
  [Symbol.toStringTag]: "Promise",
}));

// Make update().set().where() resolve
mockDb.set.mockImplementation((v: unknown) => {
  updatedRows.push(v);
  return {
    where: () => Promise.resolve({ affectedRows: 1 }),
  };
});

vi.mock("../../server/db", () => ({ getDb: vi.fn().mockResolvedValue(mockDb) }));
vi.mock("../../server/spend-protection", () => ({ resetSceneAttempts: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../../server/music-video-service", () => ({ startSceneRender: vi.fn().mockResolvedValue("task_abc123") }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(taskUid?: string) {
  return {
    headers: taskUid ? { "x-manus-cron-task-uid": taskUid } : {},
  } as any;
}

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("stuckSceneReaper", () => {
  beforeEach(() => {
    updatedRows = [];
    insertedLogs = [];
    mockStuckScenes.length = 0;
    mockAttemptCounts.length = 0;
    vi.clearAllMocks();
  });

  it("returns 403 when x-manus-cron-task-uid header is missing", async () => {
    const { stuckSceneReaperHandler } = await import("./stuckSceneReaper");
    const req = makeReq(); // no taskUid
    const res = makeRes();
    await stuckSceneReaperHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "cron-only endpoint" }));
  });

  it("returns ok:true with reaped:0 when no stuck scenes exist", async () => {
    const { stuckSceneReaperHandler } = await import("./stuckSceneReaper");
    const { getDb } = await import("../../server/db");
    const db = await (getDb as any)();

    // Override select chain to return empty array
    db.where = vi.fn().mockResolvedValue([]);
    db.select = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: db.where }) });

    const req = makeReq("cron_task_uid_123");
    const res = makeRes();
    await stuckSceneReaperHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, reaped: 0, autoRetried: 0 })
    );
  });

  it("STUCK_THRESHOLD_MS is 15 minutes (900000 ms)", async () => {
    // Read the constant value from the module source to confirm it hasn't drifted
    const src = await import("fs").then((fs) =>
      fs.readFileSync(new URL("./stuckSceneReaper.ts", import.meta.url).pathname, "utf-8")
    );
    expect(src).toContain("15 * 60 * 1000");
  });

  it("AUTO_RETRY_MAX_ATTEMPTS is 3", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync(new URL("./stuckSceneReaper.ts", import.meta.url).pathname, "utf-8")
    );
    expect(src).toContain("AUTO_RETRY_MAX_ATTEMPTS = 3");
  });

  it("handler is mounted at /api/scheduled/stuckSceneReaper in index.ts", async () => {
    const src = await import("fs").then((fs) =>
      fs.readFileSync(
        new URL("../_core/index.ts", import.meta.url).pathname,
        "utf-8"
      )
    );
    expect(src).toContain('"/api/scheduled/stuckSceneReaper"');
    expect(src).toContain("stuckSceneReaperHandler");
  });
});
