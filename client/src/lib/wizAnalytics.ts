/**
 * WIZ AI — First-party analytics tracker
 *
 * Tracks page views, sessions, and custom events using our own DB.
 * Runs entirely client-side, no external scripts required.
 *
 * Usage:
 *   import { wizAnalytics } from "@/lib/wizAnalytics";
 *   wizAnalytics.init(userId);          // call once on auth state change
 *   wizAnalytics.page("/pricing");      // call on route change
 *   wizAnalytics.event("cta_click", "conversion", "/pricing");
 */

import { trpc } from "./trpc";

// ── helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function fingerprint(): string {
  const nav = navigator;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency ?? 0,
  ].join("|");
  // Simple non-crypto hash
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function detectDevice(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|mini|windows\sce|palm/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  return "Other";
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows NT")) return "Windows";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Linux")) return "Linux";
  return "Other";
}

function getUtmParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    utmSource: p.get("utm_source") ?? undefined,
    utmMedium: p.get("utm_medium") ?? undefined,
    utmCampaign: p.get("utm_campaign") ?? undefined,
  };
}

// ── state ────────────────────────────────────────────────────────────────────

const SESSION_KEY = "wiz_sid";
const VISITOR_KEY = "wiz_vid";
const SESSION_TTL = 30 * 60 * 1000; // 30 min inactivity = new session
const SESSION_TS_KEY = "wiz_slt"; // last touch timestamp

let _sessionId: string;
let _visitorId: string;
let _userId: number | undefined;
let _pageStartTime: number = Date.now();
let _lastPath: string = "";
let _scrollDepth: number = 0;
let _trpcClient: ReturnType<typeof trpc.analytics.upsertSession.useMutation> | null = null;

// We call the tRPC procedures directly via fetch to avoid React hook rules
async function callTrpc(procedure: string, input: unknown) {
  try {
    const res = await fetch(`/api/trpc/analytics.${procedure}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: input }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── scroll tracking ──────────────────────────────────────────────────────────

function setupScrollTracking() {
  const onScroll = () => {
    const el = document.documentElement;
    const scrolled = el.scrollTop + window.innerHeight;
    const total = el.scrollHeight;
    const depth = total > 0 ? Math.round((scrolled / total) * 100) : 0;
    if (depth > _scrollDepth) _scrollDepth = Math.min(depth, 100);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

// ── session management ───────────────────────────────────────────────────────

function getOrCreateSession(): { sessionId: string; isNew: boolean } {
  const now = Date.now();
  const lastTouch = parseInt(sessionStorage.getItem(SESSION_TS_KEY) ?? "0", 10);
  const existing = sessionStorage.getItem(SESSION_KEY);

  if (existing && now - lastTouch < SESSION_TTL) {
    sessionStorage.setItem(SESSION_TS_KEY, String(now));
    return { sessionId: existing, isNew: false };
  }

  const newId = uuid();
  sessionStorage.setItem(SESSION_KEY, newId);
  sessionStorage.setItem(SESSION_TS_KEY, String(now));
  return { sessionId: newId, isNew: true };
}

function getOrCreateVisitor(): string {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const id = fingerprint() + "_" + Date.now().toString(36);
  localStorage.setItem(VISITOR_KEY, id);
  return id;
}

// ── public API ───────────────────────────────────────────────────────────────

export const wizAnalytics = {
  /** Call once when auth state is known (pass userId if logged in) */
  init(userId?: number) {
    _userId = userId;
    _visitorId = getOrCreateVisitor();
    const { sessionId, isNew } = getOrCreateSession();
    _sessionId = sessionId;

    if (isNew) {
      const utm = getUtmParams();
      callTrpc("upsertSession", {
        sessionId: _sessionId,
        visitorId: _visitorId,
        userId: _userId,
        entryPage: window.location.pathname,
        referrer: document.referrer || undefined,
        ...utm,
        device: detectDevice(),
        browser: detectBrowser(),
        os: detectOS(),
        screenWidth: screen.width,
      });
    }

    setupScrollTracking();
    _pageStartTime = Date.now();
    _lastPath = window.location.pathname;
  },

  /** Call on every SPA route change */
  page(path?: string) {
    const currentPath = path ?? window.location.pathname;

    // Flush previous page's time-on-page before recording new view
    if (_lastPath && _lastPath !== currentPath) {
      const timeOnPage = Math.round((Date.now() - _pageStartTime) / 1000);
      callTrpc("trackPageView", {
        sessionId: _sessionId,
        visitorId: _visitorId,
        userId: _userId,
        path: _lastPath,
        title: document.title,
        referrer: document.referrer || undefined,
        timeOnPage,
        scrollDepth: _scrollDepth,
      });
    }

    // Start tracking new page
    _lastPath = currentPath;
    _pageStartTime = Date.now();
    _scrollDepth = 0;

    // Record the new page view
    callTrpc("trackPageView", {
      sessionId: _sessionId,
      visitorId: _visitorId,
      userId: _userId,
      path: currentPath,
      title: document.title,
      referrer: document.referrer || undefined,
      timeOnPage: 0,
      scrollDepth: 0,
    });

    // Update session last-seen
    sessionStorage.setItem(SESSION_TS_KEY, String(Date.now()));
  },

  /** Track a custom event */
  event(
    eventName: string,
    category?: string,
    label?: string,
    value?: string,
    meta?: Record<string, unknown>
  ) {
    if (!_sessionId) return;
    callTrpc("trackEvent", {
      sessionId: _sessionId,
      visitorId: _visitorId,
      userId: _userId,
      event: eventName,
      category,
      label,
      value,
      path: window.location.pathname,
      meta,
    });
  },

  /** Flush final page view on unload */
  flush() {
    if (!_sessionId || !_lastPath) return;
    const timeOnPage = Math.round((Date.now() - _pageStartTime) / 1000);
    callTrpc("trackPageView", {
      sessionId: _sessionId,
      visitorId: _visitorId,
      userId: _userId,
      path: _lastPath,
      title: document.title,
      timeOnPage,
      scrollDepth: _scrollDepth,
    });
  },
};

// Flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => wizAnalytics.flush());
  window.addEventListener("beforeunload", () => wizAnalytics.flush());
}
