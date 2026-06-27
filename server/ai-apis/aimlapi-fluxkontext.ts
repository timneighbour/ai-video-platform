/**
 * aimlapi-fluxkontext.ts
 *
 * Flux Kontext Max via BFL direct API (api.bfl.ai)
 * Used in the IMAGE-DRIVEN pipeline to composite a locked character portrait
 * into a real venue photo using multi-image Kontext.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PIPELINE RULE — MULTI-IMAGE INPUTS (BFL direct API)
 * ═══════════════════════════════════════════════════════════════════════════
 * This function accepts:
 *   - imageUrl: the REAL venue photo (Air Studios Lyndhurst Hall)
 *               → passed as input_image (primary reference)
 *   - characterImageUrl: the approved character portrait (videoCharacters.masterPortraitUrl)
 *               → passed as input_image_2 (character reference)
 *
 * NEVER pass text descriptions of characters or venues.
 * NEVER call this function if either URL is null — the caller must enforce this.
 *
 * BFL API endpoint: POST https://api.bfl.ai/v1/flux-kontext-max
 * Auth header: x-key: <BFL_API_KEY>
 * Response: { id, polling_url } — poll GET polling_url until status="Ready"
 * ═══════════════════════════════════════════════════════════════════════════
 */

const BFL_BASE = "https://api.bfl.ai";
const BFL_ENDPOINT = `${BFL_BASE}/v1/flux-kontext-max`;

function getBflApiKey(): string {
  const key = process.env.BFL_API_KEY;
  if (!key) throw new Error("BFL_API_KEY environment variable is not set");
  return key;
}

export interface FluxKontextRequest {
  /** Primary image reference — the REAL venue photo (Air Studios Lyndhurst Hall) */
  imageUrl: string;
  /** Secondary image reference — the approved character portrait (Zara's masterPortraitUrl) */
  characterImageUrl?: string;
  /** Transformation prompt — describes how to composite character into venue */
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
  outputFormat?: "jpeg" | "png" | "webp";
  safetyTolerance?: number;
  /** Output width in pixels — overrides aspectRatio if both provided (BFL supports up to 2048) */
  width?: number;
  /** Output height in pixels — overrides aspectRatio if both provided */
  height?: number;
}

export interface FluxKontextResult {
  imageUrl: string;
  generationId: string;
}

/**
 * Submit a Flux Kontext Max job via BFL direct API.
 * Returns the polling_url for status checks.
 */
export async function submitFluxKontextTask(request: FluxKontextRequest): Promise<string> {
  const apiKey = getBflApiKey();
  console.log(`[BflFluxKontext] Submitting — venue: ${request.imageUrl.slice(0, 80)}`);
  if (request.characterImageUrl) {
    console.log(`[BflFluxKontext]   character: ${request.characterImageUrl.slice(0, 80)}`);
  }

  const body: Record<string, unknown> = {
    prompt: request.prompt,
    input_image: request.imageUrl,
    output_format: request.outputFormat ?? "jpeg",
    safety_tolerance: request.safetyTolerance ?? 6,
  };
  // Use explicit width/height if provided (higher resolution), otherwise use aspect_ratio
  if (request.width && request.height) {
    body.width = request.width;
    body.height = request.height;
  } else {
    body.aspect_ratio = request.aspectRatio ?? "16:9";
  }

  // Multi-image: pass character portrait as input_image_2 if provided
  if (request.characterImageUrl) {
    body.input_image_2 = request.characterImageUrl;
  }

  const response = await fetch(BFL_ENDPOINT, {
    method: "POST",
    headers: {
      "x-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`BflFluxKontext submit HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    polling_url?: string;
  };

  if (!data.polling_url) {
    throw new Error(`BflFluxKontext submit: no polling_url in response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[BflFluxKontext] Task submitted: ${data.id} — polling: ${data.polling_url.slice(0, 80)}`);
  return data.polling_url;
}

/**
 * Poll a Flux Kontext task via BFL polling_url.
 * Returns the result image URL when done (status="Ready").
 * Returns null if still processing (status="Pending").
 * Throws on hard failure (status="Error" or non-200).
 */
export async function pollFluxKontextTask(pollingUrl: string): Promise<string | null> {
  const apiKey = getBflApiKey();

  const response = await fetch(pollingUrl, {
    method: "GET",
    headers: {
      "x-key": apiKey,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`BflFluxKontext poll HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    result?: { sample?: string } | null;
  };

  const status = (data.status ?? "").toLowerCase();

  if (status === "ready") {
    const imageUrl = data.result?.sample;
    if (!imageUrl) throw new Error(`BflFluxKontext: status=Ready but no result.sample in response`);
    console.log(`[BflFluxKontext] Ready — image: ${imageUrl.slice(0, 80)}`);
    return imageUrl;
  }

  if (status === "error" || status === "failed") {
    throw new Error(`BflFluxKontext task failed with status: ${data.status}`);
  }

  // status="Pending" or other in-progress states
  return null;
}

/**
 * Submit and synchronously wait for a Flux Kontext result.
 * Polls up to maxWaitMs (default 180s) with 4s intervals.
 * Throws if timed out or failed.
 */
export async function runFluxKontextSync(
  request: FluxKontextRequest,
  maxWaitMs = 180_000
): Promise<string> {
  const pollingUrl = await submitFluxKontextTask(request);

  const pollIntervalMs = 4_000;
  const maxAttempts = Math.ceil(maxWaitMs / pollIntervalMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const result = await pollFluxKontextTask(pollingUrl);
    if (result) {
      console.log(`[BflFluxKontext] Done (attempt ${attempt + 1}) → ${result.slice(0, 80)}`);
      return result;
    }
    console.log(`[BflFluxKontext] Attempt ${attempt + 1}/${maxAttempts} — still processing`);
  }

  throw new Error(`BflFluxKontext task timed out after ${maxWaitMs}ms`);
}
