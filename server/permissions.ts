/**
 * ISS-029: Granular Admin Role Permissions
 *
 * Role hierarchy:
 *   admin   — full access to all operations
 *   ops     — can trigger re-renders, view all jobs/logs, manage scenes; cannot adjust credits or change system config
 *   support — can view jobs and user details, adjust credits; cannot trigger renders or change system config
 *   user    — standard subscriber access only
 *
 * Usage in tRPC procedures:
 *   import { requirePermission } from "./permissions";
 *   const myProcedure = protectedProcedure.use(requirePermission("VIEW_ALL_JOBS"));
 */

import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";

// ── Permission definitions ────────────────────────────────────────────────────

export type Permission =
  // Job / render operations
  | "VIEW_ALL_JOBS"          // View any user's jobs and scenes
  | "TRIGGER_RERENDER"       // Trigger scene/job re-renders
  | "CANCEL_JOB"             // Cancel any user's job
  | "RESET_SCENE"            // Reset a stuck scene
  // Credit / billing operations
  | "ADJUST_CREDITS"         // Add or subtract credits from any user
  | "VIEW_USER_BILLING"      // View subscription and payment history
  // System / config operations
  | "VIEW_PROVIDER_BALANCES" // View API provider spend and balances
  | "RECONNECT_DB"           // Trigger database reconnect
  | "SYSTEM_NOTIFY"          // Send owner notifications
  | "ATLAS_HEALTH_CHECK"     // Run Atlas provider health check
  // User management
  | "SEARCH_USERS"           // Search and view user accounts
  | "PROMOTE_USER"           // Change a user's role (admin only)
  // Logs / diagnostics
  | "VIEW_LOGS"              // View server logs and job diagnostics
  | "VIEW_SPEND_REPORT"      // View spend efficiency reports
  ;

// ── Role → permissions mapping ────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, Set<Permission>> = {
  admin: new Set<Permission>([
    "VIEW_ALL_JOBS", "TRIGGER_RERENDER", "CANCEL_JOB", "RESET_SCENE",
    "ADJUST_CREDITS", "VIEW_USER_BILLING",
    "VIEW_PROVIDER_BALANCES", "RECONNECT_DB", "SYSTEM_NOTIFY", "ATLAS_HEALTH_CHECK",
    "SEARCH_USERS", "PROMOTE_USER",
    "VIEW_LOGS", "VIEW_SPEND_REPORT",
  ]),
  ops: new Set<Permission>([
    "VIEW_ALL_JOBS", "TRIGGER_RERENDER", "CANCEL_JOB", "RESET_SCENE",
    "VIEW_PROVIDER_BALANCES", "ATLAS_HEALTH_CHECK",
    "SEARCH_USERS",
    "VIEW_LOGS", "VIEW_SPEND_REPORT",
  ]),
  support: new Set<Permission>([
    "VIEW_ALL_JOBS",
    "ADJUST_CREDITS", "VIEW_USER_BILLING",
    "SEARCH_USERS",
    "VIEW_LOGS",
  ]),
  user: new Set<Permission>([]),
};

// ── Helper: check if a role has a permission ─────────────────────────────────

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

// ── tRPC middleware factory ───────────────────────────────────────────────────

/**
 * Returns a tRPC middleware that requires the authenticated user to have
 * the specified permission. Throws FORBIDDEN if not.
 *
 * @example
 *   const myProcedure = protectedProcedure.use(requirePermission("VIEW_ALL_JOBS"));
 */
export function requirePermission(permission: Permission) {
  return protectedProcedure.use(async (opts) => {
    const { ctx, next } = opts;
    const role = ctx.user?.role as string | undefined;
    if (!hasPermission(role, permission)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Your role does not have the '${permission}' permission.`,
      });
    }
    return next();
  });
}

/**
 * Pre-built procedures for common permission groups.
 * These are ready-to-use procedure bases — chain .input().query() or .mutation() on them.
 *
 * @example
 *   opsOrAdminProcedure.input(z.object({ jobId: z.number() })).query(async ({ ctx, input }) => { ... })
 */
export const opsOrAdminProcedure = requirePermission("VIEW_ALL_JOBS");
export const supportOrAdminProcedure = requirePermission("ADJUST_CREDITS");
