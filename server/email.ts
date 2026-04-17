/**
 * WIZ AI Email Notifications — Resend
 *
 * Sends transactional emails to the WIZ AI owner (timneighbour@wizvid.ai)
 * for key business events: new signups, subscriptions, credit purchases,
 * failed payments, and render completions.
 *
 * Also sends render-complete notifications directly to the user who
 * submitted the render, with a direct link to their finished video.
 *
 * Requires RESEND_API_KEY environment variable.
 * Falls back to a no-op (console.warn) when the key is absent.
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OWNER_EMAIL = "timneighbour@wizvid.ai";
const FROM_EMAIL = "WIZ AI Notifications <notifications@wizvid.ai>";

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

async function sendToEmail(to: string, payload: EmailPayload): Promise<void> {
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
      console.error("[Email] Resend error:", error);
    } else {
      console.log(`[Email] Sent to ${to}:`, payload.subject);
    }
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
    // Never throw — email failures must not break the main flow
  }
}

async function sendOwnerEmail(payload: EmailPayload): Promise<void> {
  await sendToEmail(OWNER_EMAIL, payload);
}

// ── Styled email template ────────────────────────────────────────────────────
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
              <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">WIZ AI</span>
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
        WIZ AI · wizvid.ai · Automated notification
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Public notification helpers ───────────────────────────────────────────────

/** New user signup */
export async function emailNewSignup(user: {
  name: string;
  email: string;
  id: number;
  createdAt?: Date;
}): Promise<void> {
  await sendOwnerEmail({
    subject: `🎉 New Signup — ${user.name}`,
    html: template("New User Signup", [
      ["Name", user.name || "Unknown"],
      ["Email", user.email || "—"],
      ["User ID", String(user.id)],
      ["Time", (user.createdAt ?? new Date()).toUTCString()],
    ]),
  });
}

/** New subscription activated */
export async function emailNewSubscription(data: {
  name: string;
  email: string;
  plan: string;
  amount: number;
  interval?: string;
}): Promise<void> {
  await sendOwnerEmail({
    subject: `💳 New Subscription — ${data.plan.toUpperCase()} — ${data.name}`,
    html: template("New Subscription Activated", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Plan", data.plan.toUpperCase()],
      ["Amount", `£${(data.amount / 100).toFixed(2)}${data.interval ? `/${data.interval}` : ""}`],
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
}): Promise<void> {
  await sendOwnerEmail({
    subject: `🎬 Credit Purchase — ${data.credits} credits — ${data.name}`,
    html: template("Credit Pack Purchased", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Pack", data.packLabel || `${data.credits} credits`],
      ["Credits", String(data.credits)],
      ["Amount", `£${(data.amount / 100).toFixed(2)}`],
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

/** Render job completed — notifies owner AND the user who submitted the render */
export async function emailRenderComplete(data: {
  name: string;
  email: string;
  jobId: string;
  quality: string;
  duration?: number;
  videoUrl?: string;
  origin?: string;
}): Promise<void> {
  // 1. Notify owner (internal ops log)
  await sendOwnerEmail({
    subject: `✅ Render Complete — ${data.quality} — ${data.name}`,
    html: template("Render Job Completed", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Job ID", data.jobId],
      ["Quality", data.quality],
      ["Duration", data.duration ? `${data.duration}s` : "—"],
      ["Video URL", data.videoUrl ? `<a href="${data.videoUrl}" style="color:#a5b4fc;">Watch</a>` : "—"],
      ["Time", new Date().toUTCString()],
    ]),
  });

  // 2. Notify the user directly with a "Your video is ready" email
  if (data.email) {
    const videoLink = data.videoUrl ?? (data.origin ? `${data.origin}/render/history` : "https://www.wizvid.ai/render/history");
    const client = getResend();
    if (!client) return;
    try {
      await client.emails.send({
        from: FROM_EMAIL,
        to: data.email,
        subject: `🎬 Your WIZ AI video is ready! (${data.quality})`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr>
      <td style="background:#1a1a2e;border-radius:12px;overflow:hidden;border:1px solid #2d2d4e;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:24px 24px 20px;background:linear-gradient(135deg,#1e1b4b,#312e81);">
              <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">WIZ AI</span>
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:4px;">Your video is ready 🎉</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 24px;">
          <tr><td style="color:#f3f4f6;font-size:15px;padding-bottom:12px;">Hi ${data.name || "there"},</td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:20px;">
            Your <strong style="color:#a5b4fc;">${data.quality}</strong> WIZ AI video has finished rendering and is ready to watch and download.
          </td></tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${videoLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
                Watch Your Video →
              </a>
            </td>
          </tr>
          <tr><td style="color:#6b7280;font-size:12px;border-top:1px solid #2d2d4e;padding-top:16px;">
            If the button doesn't work, copy this link:<br/>
            <a href="${videoLink}" style="color:#a5b4fc;word-break:break-all;">${videoLink}</a>
          </td></tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:16px;text-align:center;color:#4b5563;font-size:11px;">WIZ AI · wizvid.ai · Automated notification</td></tr>
  </table>
</body>
</html>`,
      });
      console.log(`[Email] Render complete email sent to user: ${data.email}`);
    } catch (err) {
      console.error("[Email] Failed to send render complete email to user:", err);
    }
  }
}
