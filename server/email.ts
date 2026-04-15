/**
 * WizVid Email Notifications — Resend
 *
 * Sends transactional emails to:
 *   - The WizVid owner (timneighbour@wizvid.ai) for business events
 *   - The user directly for render completions and signup welcome
 *
 * Requires RESEND_API_KEY environment variable.
 * Falls back to a no-op (console.warn) when the key is absent.
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = "timneighbour@wizvid.ai";
const FROM_EMAIL = "WizVid <notifications@wizvid.ai>";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — email notifications disabled");
    return null;
  }
  if (!resend) {
    resend = new Resend(RESEND_API_KEY);
  }
  return resend;
}

interface EmailPayload {
  subject: string;
  html: string;
}

async function sendOwnerEmail(payload: EmailPayload): Promise<void> {
  const client = getResend();
  if (!client) return;
  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      console.error("[Email] Resend error (owner):", error);
    } else {
      console.log("[Email] Sent to owner:", payload.subject);
    }
  } catch (err) {
    console.error("[Email] Failed to send owner email:", err);
    // Never throw — email failures must not break the main flow
  }
}

async function sendUserEmail(to: string, payload: EmailPayload): Promise<void> {
  if (!to || !to.includes("@")) {
    console.warn("[Email] Invalid user email — skipping user email:", to);
    return;
  }
  const client = getResend();
  if (!client) return;
  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: payload.subject,
      html: payload.html,
    });
    if (error) {
      console.error("[Email] Resend error (user):", error);
    } else {
      console.log("[Email] Sent to user:", payload.subject, "→", to);
    }
  } catch (err) {
    console.error("[Email] Failed to send user email:", err);
    // Never throw
  }
}

// ── Styled email template (owner / internal) ─────────────────────────────────
function template(title: string, rows: [string, string][], note?: string): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 16px;color:#9ca3af;font-size:13px;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:8px 16px;color:#f3f4f6;font-size:13px;font-weight:600;">${value}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr>
      <td style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2d2d4e;">
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:24px 24px 20px;background:linear-gradient(135deg,#1e1b4b,#312e81);">
              <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">WizVid AI</span>
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:4px;">${title}</span>
            </td>
          </tr>
        </table>
        <!-- Body -->
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 0 16px;">
          ${rowsHtml}
        </table>
        ${
          note
            ? `<table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:12px 16px 20px;color:#6b7280;font-size:12px;border-top:1px solid #2d2d4e;">${note}</td>
            </tr>
          </table>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:16px;text-align:center;color:#4b5563;font-size:11px;">
        WizVid AI · wizvid.ai · Automated notification
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── User-facing email template (branded, CTA) ─────────────────────────────────
function userTemplate(title: string, body: string, ctaText?: string, ctaUrl?: string): string {
  const ctaBlock = ctaText && ctaUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="padding:0 24px 28px;">
        <tr>
          <td align="center">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">${ctaText}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr>
      <td style="background:#1a1a2e;border-radius:14px;overflow:hidden;border:1px solid #2d2d4e;">
        <!-- Header gradient -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:28px 28px 22px;background:linear-gradient(135deg,#1e1b4b,#312e81);">
              <span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">WizVid</span>
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:6px;">${title}</span>
            </td>
          </tr>
        </table>
        <!-- Body text -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:24px 28px 20px;color:#d1d5db;font-size:15px;line-height:1.7;">
              ${body}
            </td>
          </tr>
        </table>
        ${ctaBlock}
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 28px 20px;border-top:1px solid #2d2d4e;color:#4b5563;font-size:11px;">
              You received this email because you have a WizVid account. <a href="https://wizvid.ai" style="color:#7c3aed;text-decoration:none;">wizvid.ai</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Public notification helpers ───────────────────────────────────────────────

/** New user signup — notifies owner AND sends welcome email to user */
export async function emailNewSignup(user: {
  name: string;
  email: string;
  id: number;
  createdAt?: Date;
}): Promise<void> {
  // Owner notification
  await sendOwnerEmail({
    subject: `🎉 New Signup — ${user.name}`,
    html: template("New User Signup", [
      ["Name", user.name || "Unknown"],
      ["Email", user.email || "—"],
      ["User ID", String(user.id)],
      ["Time", (user.createdAt ?? new Date()).toUTCString()],
    ]),
  });

  // Welcome email to user
  if (user.email) {
    const firstName = (user.name || "there").split(" ")[0];
    await sendUserEmail(user.email, {
      subject: "Welcome to WizVid — your account is ready 🎬",
      html: userTemplate(
        "Welcome to WizVid",
        `Hi ${firstName},<br><br>
        Your WizVid account is ready. You've been given <strong style="color:#a78bfa;">free trial credits</strong> to get started — no payment needed.<br><br>
        WizVid lets you create cinematic AI videos in minutes. Just describe your idea, approve the storyboard, and we render the full video for you.<br><br>
        Click below to start creating your first video:`,
        "Start Creating Free",
        "https://wizvid.ai/onboarding"
      ),
    });
  }
}

/** New subscription activated */
export async function emailNewSubscription(data: {
  name: string;
  email: string;
  plan: string;
  amount: number;
  interval?: string;
  stripeSessionId?: string;
}): Promise<void> {
  await sendOwnerEmail({
    subject: `💳 New Subscription — ${data.plan.toUpperCase()} — ${data.name}`,
    html: template("New Subscription Activated", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Plan", data.plan.toUpperCase()],
      ["Amount", `£${(data.amount / 100).toFixed(2)}${data.interval ? `/${data.interval}` : ""}`],
      ["Stripe Session", data.stripeSessionId || "—"],
      ["Time", new Date().toUTCString()],
    ]),
  });
}

/** Credit pack purchase */
export async function emailCreditPurchase(data: {
  name: string;
  email: string;
  credits: number;
  amount: number;
  packLabel?: string;
  stripeSessionId?: string;
}): Promise<void> {
  await sendOwnerEmail({
    subject: `🎬 Credit Purchase — ${data.credits} credits — ${data.name}`,
    html: template("Credit Pack Purchased", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Pack", data.packLabel || `${data.credits} credits`],
      ["Credits", String(data.credits)],
      ["Amount", `£${(data.amount / 100).toFixed(2)}`],
      ["Stripe Session", data.stripeSessionId || "—"],
      ["Time", new Date().toUTCString()],
    ]),
  });
}

/** Failed payment */
export async function emailFailedPayment(data: {
  name?: string;
  email?: string;
  amount?: number;
  reason?: string;
}): Promise<void> {
  await sendOwnerEmail({
    subject: `⚠️ Failed Payment${data.name ? ` — ${data.name}` : ""}`,
    html: template(
      "Payment Failed",
      [
        ["Customer", data.name || "Unknown"],
        ["Email", data.email || "—"],
        ["Amount", data.amount ? `£${(data.amount / 100).toFixed(2)}` : "—"],
        ["Reason", data.reason || "Unknown"],
        ["Time", new Date().toUTCString()],
      ],
      "Check Stripe Dashboard → Events for full details."
    ),
  });
}

/** Render job completed — notifies owner AND sends "your video is ready" email to user */
export async function emailRenderComplete(data: {
  name: string;
  email: string;
  jobId: string;
  quality: string;
  duration?: number;
  videoUrl?: string;
}): Promise<void> {
  // Owner notification
  await sendOwnerEmail({
    subject: `✅ Render Complete — ${data.quality} — ${data.name}`,
    html: template("Render Job Completed", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Job ID", data.jobId],
      ["Quality", data.quality],
      ["Duration", data.duration ? `${data.duration}s` : "—"],
      ["Time", new Date().toUTCString()],
    ]),
  });

  // User notification — "your video is ready"
  if (data.email) {
    const firstName = (data.name || "there").split(" ")[0];
    const dashboardUrl = "https://wizvid.ai/projects";
    await sendUserEmail(data.email, {
      subject: "Your WizVid video is ready to download 🎬",
      html: userTemplate(
        "Your video is ready",
        `Hi ${firstName},<br><br>
        Great news — your WizVid render is complete! Your video is ready to watch, download, and share.<br><br>
        <strong style="color:#a78bfa;">Job ID:</strong> ${data.jobId}<br>
        <strong style="color:#a78bfa;">Quality:</strong> ${data.quality}<br>
        ${data.duration ? `<strong style="color:#a78bfa;">Duration:</strong> ${data.duration}s<br>` : ""}
        <br>
        Head to your Projects dashboard to download your video:`,
        "View My Videos",
        dashboardUrl
      ),
    });
  }
}
