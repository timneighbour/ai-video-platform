/**
 * MVSEP Vocal Isolation API
 * ==========================
 * Submits an audio file URL to the MVSEP API for vocal stem separation using
 * the BS Roformer ensemble model (SDR 11.93 — the highest-quality preset).
 *
 * MVSEP replaces WaveSpeed AI as the primary vocal isolation provider.
 * It accepts a direct public URL, runs async separation, and returns
 * download URLs for each stem when complete.
 *
 * API reference: https://mvsep.com/en/full_api
 *
 * Separation type used:
 *   sep_type=26  Ensemble (vocals, instrum)
 *   add_opt2=7   SDR Vocals 11.93 (Mel Roformer, BS Roformer x2, SCNet XL IHF) — best quality
 *   output_format=1  WAV 16-bit (clean, lossless for lip sync)
 *
 * API flow (verified from live docs 2026-07-01):
 *   POST /api/separation/create  → returns { success: true, data: { hash: "...", link: "..." } }
 *   GET  /api/separation/get?hash=<hash>  → returns status + data.files when done
 *
 * NOTE: "get-remote" endpoint is only for a separate remote-job workflow with short
 * alphanumeric hashes — NOT for standard URL-based submissions.
 */

const MVSEP_BASE = "https://mvsep.com/api";

export interface MvsepSubmitResult {
  /** MVSEP job hash — filename-based string, e.g. "20230327071601-0e3e5c6c85-13-song.mp3" */
  jobId: string;
}

export interface MvsepPollResult {
  status: "waiting" | "processing" | "done" | "error";
  vocalsUrl?: string;
  instrumentalUrl?: string;
  errorMessage?: string;
  rawData?: Array<{ name: string; url: string }>;
}

/**
 * Submit a vocal isolation job to MVSEP.
 * @param audioUrl - Public URL of the audio file to process
 * @returns MVSEP job hash to poll with
 */
export async function submitMvsepVocalIsolation(audioUrl: string): Promise<MvsepSubmitResult> {
  const apiToken = process.env.MVSEP_API_KEY;
  if (!apiToken) throw new Error("MVSEP_API_KEY not configured");

  const body = new URLSearchParams({
    api_token: apiToken,
    url: audioUrl,
    remote_type: "direct",
    sep_type: "26",      // Ensemble (vocals, instrum)
    add_opt2: "7",       // SDR Vocals 11.93 — best quality preset
    output_format: "1",  // WAV 16-bit — clean for lip sync
    is_demo: "false",
  });

  const res = await fetch(`${MVSEP_BASE}/separation/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MVSEP submit failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  const json = await res.json() as any;

  // MVSEP returns { success: true, data: { hash: "...", link: "..." } } on success
  if (!json.success || !json.data?.hash) {
    const msg = json.data?.message ?? JSON.stringify(json).slice(0, 300);
    throw new Error(`MVSEP submit error: ${msg}`);
  }

  return { jobId: String(json.data.hash) };
}

/**
 * Poll an existing MVSEP separation job for results.
 * @param mvsepJobHash - The job hash returned by submitMvsepVocalIsolation
 */
export async function pollMvsepVocalIsolation(mvsepJobHash: string): Promise<MvsepPollResult> {
  const apiToken = process.env.MVSEP_API_KEY;
  if (!apiToken) throw new Error("MVSEP_API_KEY not configured");

  // Standard polling endpoint for URL-based submissions
  const url = `${MVSEP_BASE}/separation/get?hash=${encodeURIComponent(mvsepJobHash)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MVSEP poll failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  const json = await res.json() as any;

  // MVSEP returns { success: true/false, status: "...", data: { ... } }
  if (!json.success) {
    return { status: "error", errorMessage: json.data?.message ?? JSON.stringify(json).slice(0, 300) };
  }

  // Map MVSEP status strings to our internal status
  const rawStatus: string = (json.status ?? "waiting").toLowerCase();
  let status: MvsepPollResult["status"];
  if (rawStatus === "done" || rawStatus === "success" || rawStatus === "finished") {
    status = "done";
  } else if (rawStatus === "failed" || rawStatus === "error") {
    status = "error";
  } else if (rawStatus === "processing" || rawStatus === "distributing" || rawStatus === "merging") {
    status = "processing";
  } else {
    // "waiting", "not_found", or unknown
    status = "waiting";
  }

  if (status === "error") {
    return { status: "error", errorMessage: json.data?.message ?? "MVSEP separation failed" };
  }

  if (status !== "done") {
    return { status };
  }

  // Extract stem URLs from the results array
  // MVSEP done response: json.data.files = [{ name: "vocals.wav", url: "https://..." }, ...]
  const files: Array<{ name: string; url: string }> = json.data?.files ?? [];
  let vocalsUrl: string | undefined;
  let instrumentalUrl: string | undefined;

  for (const file of files) {
    const nameLower = (file.name ?? "").toLowerCase();
    if (
      nameLower.includes("vocal") ||
      nameLower.includes("voice") ||
      nameLower.includes("lead")
    ) {
      vocalsUrl = file.url;
    } else if (
      nameLower.includes("instrum") ||
      nameLower.includes("accompaniment") ||
      nameLower.includes("no_vocal") ||
      nameLower.includes("other")
    ) {
      instrumentalUrl = file.url;
    }
  }

  // Fallback: if we couldn't identify by name, take the first file as vocals
  if (!vocalsUrl && files.length > 0) {
    vocalsUrl = files[0].url;
  }

  return { status: "done", vocalsUrl, instrumentalUrl, rawData: files };
}
