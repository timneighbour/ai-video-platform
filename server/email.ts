/**
 * WIZ AI Email Notifications — Resend
 *
 * Sends transactional emails to the WIZ AI owner (tim@wiz-ai.io)
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
const OWNER_EMAIL = "tim@wiz-ai.io"; // Owner receives at wiz-ai.io (Zoho)
// Sending domain: wizvid.ai is verified in Resend (SPF + DKIM + DMARC green)
// wiz-ai.io will be added to Resend once the account is upgraded
const FROM_EMAIL = "WIZ AI Notifications <notifications@wizvid.ai>";
const FROM_WELCOME = "WIZ AI <welcome@wizvid.ai>";
const FROM_BROADCAST = "WIZ AI <updates@wizvid.ai>";
// Reply-To routes replies to the canonical wiz-ai.io support inbox
const REPLY_TO = "support@wiz-ai.io";

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
      replyTo: REPLY_TO,
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
        WIZ AI · wiz-ai.io · Automated notification
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
    subject: `– New Signup — ${user.name}`,
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
    subject: `– Credit Purchase — ${data.credits} credits — ${data.name}`,
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

/** Welcome email sent directly to a new user on sign-up */
export async function emailWelcomeUser(user: {
  name: string;
  email: string;
  origin?: string;
}): Promise<void> {
  if (!user.email) return;
  const client = getResend();
  if (!client) return;

  const firstName = (user.name || "there").split(" ")[0];
  const startUrl = user.origin ? `${user.origin}/onboarding` : "https://www.wiz-ai.io/onboarding";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to WIZ AI</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#0f0f17;border-radius:16px;overflow:hidden;border:1px solid rgba(196,164,100,0.18);">
          <!-- Gold header bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#c4a464,#e8c97a,#c4a464);">&nbsp;</td>
          </tr>
          <!-- Logo / brand header -->
          <tr>
            <td style="padding:36px 40px 28px;background:linear-gradient(135deg,#0f0f17 0%,#1a1508 100%);text-align:center;">
              <div style="display:inline-block;">
                <span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#e8c97a;">WIZ AI</span>
                <span style="display:block;font-size:12px;font-weight:600;letter-spacing:0.25em;color:rgba(196,164,100,0.55);text-transform:uppercase;margin-top:4px;">Next-Gen AI Creative Studio</span>
              </div>
            </td>
          </tr>
          <!-- Hero message -->
          <tr>
            <td style="padding:32px 40px 24px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#f5f0e8;letter-spacing:-0.5px;">Welcome aboard, ${firstName}! 🎬</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.65);">You've just unlocked the most powerful AI creative studio on the planet. Generate original music, create cinematic visuals, animate characters, and produce professional videos — all from a single prompt.</p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.65);">Your account is ready. Your free trial credits are waiting. Let's create something extraordinary.</p>
              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#c4a464,#e8c97a);">
                    <a href="${startUrl}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:800;color:#0a0a0f;text-decoration:none;letter-spacing:-0.3px;">Start Creating — Free →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Feature highlights -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(196,164,100,0.12);padding-top:24px;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#e8c97a;">🎵 WizSound™</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);">Generate original, royalty-free music from a text prompt</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#e8c97a;">🎬 WizVideo™</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);">Turn scripts into cinematic music videos with AI characters</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#e8c97a;">✨ WizLumina™</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);">Generate stunning AI images and visual art in seconds</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#e8c97a;">🤖 WizPilot™</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.45);">One prompt. Full pipeline. Zero manual steps.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Secondary CTA -->
          <tr>
            <td style="padding:20px 40px 36px;background:rgba(196,164,100,0.04);border-top:1px solid rgba(196,164,100,0.08);">
              <p style="margin:0 0 12px;font-size:13px;color:rgba(255,255,255,0.40);">Need help getting started?</p>
              <a href="https://www.wiz-ai.io/help" style="font-size:13px;font-weight:600;color:#c4a464;text-decoration:none;">Visit our Help Centre →</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">You're receiving this because you created a WIZ AI account. &copy; 2025 WIZ AI · <a href="https://www.wiz-ai.io" style="color:rgba(196,164,100,0.5);text-decoration:none;">wiz-ai.io</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await client.emails.send({
      from: FROM_WELCOME,
      replyTo: REPLY_TO,
      to: user.email,
      subject: `Welcome to WIZ AI, ${firstName}! Your creative studio is ready 🎬`,
      html,
    });
    if (error) {
      console.error("[Email] Welcome email error:", error);
    } else {
      console.log(`[Email] Welcome email sent to: ${user.email}`);
    }
  } catch (err) {
    console.error("[Email] Failed to send welcome email:", err);
  }
}

/**
 * Send a broadcast email to a single recipient (used by the admin broadcast tool).
 * Call this in a loop over all users — Resend handles delivery.
 * @param unsubscribeToken - HMAC token for one-click unsubscribe (base64url encoded)
 */
export async function emailBroadcastSingle(
  to: string,
  name: string,
  subject: string,
  bodyHtml: string,
  unsubscribeToken?: string
): Promise<void> {
  const client = getResend();
  if (!client) return;
  const firstName = (name || "there").split(" ")[0];
  // Inject personalisation token
  const personalised = bodyHtml.replace(/\{\{name\}\}/g, firstName);
  const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#0f0f17;border-radius:16px;overflow:hidden;border:1px solid rgba(196,164,100,0.18);">
          <tr><td style="height:4px;background:linear-gradient(90deg,#c4a464,#e8c97a,#c4a464);">&nbsp;</td></tr>
          <tr>
            <td style="padding:28px 40px 20px;background:linear-gradient(135deg,#0f0f17 0%,#1a1508 100%);">
              <span style="font-size:22px;font-weight:900;letter-spacing:-1px;color:#e8c97a;">WIZ AI</span>
              <span style="display:block;font-size:11px;font-weight:600;letter-spacing:0.25em;color:rgba(196,164,100,0.50);text-transform:uppercase;margin-top:3px;">Next-Gen AI Creative Studio</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 36px;font-size:15px;line-height:1.75;color:rgba(255,255,255,0.70);">
              ${personalised}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">You're receiving this as a WIZ AI member. &copy; 2025 WIZ AI · <a href="https://www.wiz-ai.io" style="color:rgba(196,164,100,0.5);text-decoration:none;">wiz-ai.io</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const BASE_URL = "https://www.wiz-ai.io";
  const unsubscribeUrl = unsubscribeToken
    ? `${BASE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    : `${BASE_URL}/unsubscribe?email=${encodeURIComponent(to)}`;
  try {
    await client.emails.send({
      from: FROM_BROADCAST,
      replyTo: REPLY_TO,
      to,
      subject,
      html: wrappedHtml.replace(
        `<p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">You're receiving this as a WIZ AI member. &copy; 2025 WIZ AI · <a href="https://www.wiz-ai.io" style="color:rgba(196,164,100,0.5);text-decoration:none;">wiz-ai.io</a></p>`,
        `<p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">You're receiving this as a WIZ AI member. &copy; 2025 WIZ AI &middot; <a href="https://www.wiz-ai.io" style="color:rgba(196,164,100,0.5);text-decoration:none;">wiz-ai.io</a> &middot; <a href="${unsubscribeUrl}" style="color:rgba(196,164,100,0.5);text-decoration:none;">Unsubscribe</a></p>`
      ),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (err) {
    console.error(`[Email] Broadcast send failed for ${to}:`, err);
  }
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
    subject: `– Render Complete — ${data.quality} — ${data.name}`,
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
    const videoLink = data.videoUrl ?? (data.origin ? `${data.origin}/render/history` : "https://www.wiz-ai.io/render/history");
    const client = getResend();
    if (!client) return;
    try {
      await client.emails.send({
        from: FROM_EMAIL,
      replyTo: REPLY_TO,
        to: data.email,
        subject: `– Your WIZ AI video is ready! (${data.quality})`,
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
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:4px;">Your video is ready </span>
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
    <tr><td style="padding:16px;text-align:center;color:#4b5563;font-size:11px;">WIZ AI · wiz-ai.io · Automated notification</td></tr>
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

/**
 * emailJobResurrected — Sent to a subscriber when their job was stuck and
 * has been automatically recovered by the self-healing pipeline.
 * Reassures them that their video is still being processed and gives an ETA.
 */
export async function emailJobResurrected(data: {
  name: string;
  email: string;
  jobId: string;
  jobTitle?: string;
  failureMode: string;
  origin?: string;
}): Promise<void> {
  if (!data.email) return;
  const client = getResend();
  if (!client) return;

  const dashboardLink = data.origin
    ? `${data.origin}/render/history`
    : "https://www.wiz-ai.io/render/history";

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: data.email,
      subject: `– Your WIZ AI video is still being processed`,
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
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:4px;">Video processing update</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 24px;">
          <tr><td style="color:#f3f4f6;font-size:15px;padding-bottom:12px;">Hi ${data.name || "there"},</td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:16px;">
            We noticed your video <strong style="color:#a5b4fc;">${data.jobTitle ? `"${data.jobTitle}"` : `(Job #${data.jobId})`}</strong> took longer than expected to process. Our system automatically detected this and has resumed rendering.
          </td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:20px;">
            You don't need to do anything — your video is back in the queue and will be ready shortly. We'll send you another email as soon as it's complete.
          </td></tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
                Check Progress →
              </a>
            </td>
          </tr>
          <tr><td style="color:#6b7280;font-size:12px;border-top:1px solid #2d2d4e;padding-top:16px;">
            If you have any questions, reply to this email or visit <a href="https://www.wiz-ai.io" style="color:#a5b4fc;">wiz-ai.io</a>
          </td></tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:16px;text-align:center;color:#4b5563;font-size:11px;">WIZ AI · wiz-ai.io · Automated notification</td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Job resurrected email sent to subscriber: ${data.email}`);
  } catch (err) {
    console.error("[Email] Failed to send job resurrected email:", err);
  }
}

/**
 * emailProbeReminder — Sent to a subscriber when their probe clip is ready
 * and is waiting for their approval. Sent at 1h and 6h after probe readiness.
 */
export async function emailProbeReminder(data: {
  name: string;
  email: string;
  jobId: number;
  jobTitle?: string;
  hoursWaiting: number;
  origin?: string;
}): Promise<void> {
  if (!data.email) return;
  const client = getResend();
  if (!client) return;
  const reviewLink = data.origin
    ? `${data.origin}/render/history`
    : "https://www.wiz-ai.io/render/history";
  const urgency = data.hoursWaiting >= 6
    ? "Your video is still waiting — we'll auto-approve in 18 hours if we don't hear from you."
    : "Your preview is ready and waiting for your approval.";
  try {
    await client.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: data.email,
      subject: `Your WIZ AI preview is ready — action required`,
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
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:4px;">Preview approval needed</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 24px;">
          <tr><td style="color:#f3f4f6;font-size:15px;padding-bottom:12px;">Hi ${data.name || "there"},</td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:12px;">
            Your preview scene for <strong style="color:#a5b4fc;">${data.jobTitle ? `"${data.jobTitle}"` : `Job #${data.jobId}`}</strong> has been ready for ${data.hoursWaiting} hour${data.hoursWaiting !== 1 ? "s" : ""}.
          </td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:20px;">${urgency}</td></tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${reviewLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
                Review Preview →
              </a>
            </td>
          </tr>
          <tr><td style="color:#6b7280;font-size:12px;border-top:1px solid #2d2d4e;padding-top:16px;">
            If you approve, your full video will begin rendering immediately. If you reject, a new preview will be generated.
          </td></tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:16px;text-align:center;color:#4b5563;font-size:11px;">WIZ AI · wiz-ai.io · Automated notification</td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Probe reminder email sent to subscriber: ${data.email} (${data.hoursWaiting}h reminder)`);
  } catch (err) {
    console.error("[Email] Failed to send probe reminder email:", err);
  }
}

/**
 * emailProviderUnavailable — Sent to a subscriber when all rendering providers
 * are exhausted and their job has been paused with status=provider_unavailable.
 * Reassures them that their job is saved and will resume automatically.
 */
export async function emailProviderUnavailable(data: {
  name: string;
  email: string;
  jobId: string;
  jobTitle?: string;
  origin?: string;
}): Promise<void> {
  const jobLink = data.origin
    ? `${data.origin}/music-video/${data.jobId}`
    : `https://www.wiz-ai.io/music-video/${data.jobId}`;

  // 1. Notify owner
  await sendOwnerEmail({
    subject: `⚠️ Provider Unavailable — Job #${data.jobId} — ${data.name}`,
    html: template("Provider Unavailable", [
      ["Customer", data.name || "Unknown"],
      ["Email", data.email || "—"],
      ["Job ID", data.jobId],
      ["Job Title", data.jobTitle || "—"],
      ["Action Required", "Top up Atlas Cloud or WaveSpeed to resume rendering"],
      ["Time", new Date().toUTCString()],
    ]),
  });

  // 2. Notify the subscriber
  if (!data.email) return;
  const client = getResend();
  if (!client) return;
  try {
    await client.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: data.email,
      subject: `– Your WIZ AI video is saved and will resume shortly`,
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
              <span style="display:block;font-size:13px;color:#a5b4fc;margin-top:4px;">Rendering update</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 24px;">
          <tr><td style="color:#f3f4f6;font-size:15px;padding-bottom:12px;">Hi ${data.name || "there"},</td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:16px;">
            We're temporarily unable to generate your video because rendering capacity is currently unavailable.
          </td></tr>
          <tr><td style="color:#d1d5db;font-size:14px;padding-bottom:20px;">
            <strong style="color:#f3f4f6;">Your job has been saved and will automatically resume when capacity is restored.</strong> You don't need to do anything — we'll email you as soon as your video is ready.
          </td></tr>
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${jobLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
                View Your Job →
              </a>
            </td>
          </tr>
          <tr><td style="color:#6b7280;font-size:12px;border-top:1px solid #2d2d4e;padding-top:16px;">
            We apologise for the delay. Your credits have not been charged for this job.
          </td></tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:16px;text-align:center;color:#4b5563;font-size:11px;">WIZ AI · wiz-ai.io · Automated notification</td></tr>
  </table>
</body>
</html>`,
    });
    console.log(`[Email] Provider unavailable email sent to subscriber: ${data.email}`);
  } catch (err) {
    console.error("[Email] Failed to send provider unavailable email:", err);
  }
}

/** ISS-030: Subscription cancellation — sent to owner when customer.subscription.deleted fires */
export async function emailSubscriptionCancelled(data: {
  name?: string;
  email?: string;
  plan?: string;
  stripeSubscriptionId?: string;
}): Promise<void> {
  await sendOwnerEmail({
    subject: `❌ Subscription Cancelled${data.name ? ` — ${data.name}` : ""}`,
    html: template(
      "Subscription Cancelled",
      [
        ["Customer", data.name || "Unknown"],
        ["Email", data.email || "—"],
        ["Plan", data.plan?.toUpperCase() || "—"],
        ["Stripe Sub ID", data.stripeSubscriptionId || "—"],
        ["Time", new Date().toUTCString()],
      ],
      "The subscription has been marked as canceled in the database."
    ),
  });
}

/** ISS-008: Assembly failure — sent to the user when their music video fails to assemble */
export async function emailAssemblyFailed(data: {
  name: string;
  email: string;
  jobId: string;
  title: string;
  errorMessage?: string;
}): Promise<void> {
  if (!data.email) return;
  const client = getResend();
  if (!client) return;

  const firstName = (data.name || "there").split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#0f0f17;border-radius:16px;overflow:hidden;border:1px solid rgba(196,164,100,0.18);">
          <tr><td style="height:4px;background:linear-gradient(90deg,#c4a464,#e8c97a,#c4a464);">&nbsp;</td></tr>
          <tr>
            <td style="padding:28px 40px 20px;background:linear-gradient(135deg,#0f0f17 0%,#1a1508 100%);">
              <span style="font-size:22px;font-weight:900;letter-spacing:-1px;color:#e8c97a;">WIZ AI</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#f5f0e8;">We couldn't assemble your video</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.65);">Hi ${firstName},</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.65);">Unfortunately we ran into a problem assembling your music video <strong style="color:#e8c97a;">${data.title}</strong> (Job #${data.jobId}).</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.65);">Our team has been notified. You can retry the assembly from your dashboard, or contact us if the problem persists.</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#c4a464,#e8c97a);">
                    <a href="https://wiz-ai.io/dashboard" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:#0a0a0f;text-decoration:none;">Go to Dashboard →</a>
                  </td>
                </tr>
              </table>
              ${data.errorMessage ? `<p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.25);">Technical details: ${data.errorMessage}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">WIZ AI · wiz-ai.io · Automated notification</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: data.email,
      subject: `⚠️ Your WIZ AI video couldn't be assembled — Job #${data.jobId}`,
      html,
    });
    if (error) {
      console.error("[Email] Assembly failed email error:", error);
    } else {
      console.log(`[Email] Assembly failed email sent to: ${data.email}`);
    }
  } catch (err) {
    console.error("[Email] Failed to send assembly failed email:", err);
  }
}
