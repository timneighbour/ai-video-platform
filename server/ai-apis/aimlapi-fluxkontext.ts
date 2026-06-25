/**
 * aimlapi-fluxkontext.ts
 *
 * Flux Kontext Max via AI/ML API (aimlapi.com)
 * Used in the IMAGE-DRIVEN pipeline to place a locked character portrait
 * into a venue background image.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PIPELINE RULE — IMAGE INPUTS ONLY
 * ═══════════════════════════════════════════════════════════════════════════
 * This function accepts:
 *   - imageUrl: the approved venue storyboard (musicVideoScenes.previewImageUrl)
 *   - characterImageUrl: the approved character portrait (videoCharacters.masterPortraitUrl)
 *
 * NEVER pass text descriptions of characters or venues.
 * NEVER call this function if either URL is null — the caller must enforce this.
 *
 * The prompt must ONLY describe the transformation (e.g. "replace the character
 * silhouette with the person from the reference image"). It must NEVER describe
 * the character's appearance or the venue in text.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const AIMLAPI_BASE = "https://api.aimlapi.com";
const FLUX_KONTEXT_MODEL = "flux-pro/kontext/max";

function getApiKey(): string {
  const key = process.env.AIML_API_KEY;
  if (!key) throw new Error("AIML_API_KEY environment variable is not set");
  return key;
}

export interface FluxKontextRequest {
  /** Approved venue storyboard URL from musicVideoScenes.previewImageUrl */
  imageUrl: string;
  /** Minimal transformation prompt — NO character/venue text descriptions */
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:3";
  outputFormat?: "jpeg" | "png";
  safetyTolerance?: number;
}

export interface FluxKontextResult {
  imageUrl: string;
  generationId: string;
}

/**
 * Submit a Flux Kontext Max job via AI/ML API.
 * Returns the generation ID for polling.
 */
export async function submitFluxKontextTask(request: FluxKontextRequest): Promise<string> {
  const apiKey = getApiKey();
  console.log(`[AimlFluxKontext] Submitting — image: ${request.imageUrl.slice(0, 80)}`);

  const body: Record<string, unknown> = {
    model: FLUX_KONTEXT_MODEL,
    image_url: request.imageUrl,
    prompt: request.prompt,
    aspect_ratio: request.aspectRatio ?? "16:9",
    output_format: request.outputFormat ?? "jpeg",
    safety_tolerance: request.safetyTolerance ?? 2,
  };

  const response = await fetch(`${AIMLAPI_BASE}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AimlFluxKontext submit HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    data?: Array<{ url?: string }>;
    url?: string;
  };

  // Some AI/ML API image endpoints return the result synchronously in data[0].url
  if (data.data?.[0]?.url) {
    console.log(`[AimlFluxKontext] Synchronous result: ${data.data[0].url.slice(0, 80)}`);
    // Return a synthetic "done" ID so the caller can detect immediate completion
    return `done:${data.data[0].url}`;
  }

  if (!data.id) {
    throw new Error(`AimlFluxKontext submit: no id in response: ${JSON.stringify(data).slice(0, 300)}`);
  }

  console.log(`[AimlFluxKontext] Task submitted: ${data.id}`);
  return data.id;
}

/**
 * Poll a Flux Kontext task. Returns the result image URL when done.
 * Returns null if still processing.
 * Throws on hard failure.
 */
export async function pollFluxKontextTask(generationId: string): Promise<string | null> {
  // Handle synchronous "done:" prefix from submitFluxKontextTask
  if (generationId.startsWith("done:")) {
    return generationId.slice("done:".length);
  }

  const apiKey = getApiKey();
  const url = new URL(`${AIMLAPI_BASE}/v1/images/generations`);
  url.searchParams.set("generation_id", generationId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AimlFluxKontext poll HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    id?: string;
    status?: string;
    data?: Array<{ url?: string }>;
    error?: { message?: string } | null;
  };

  const status = (data.status ?? "").toLowerCase();

  if (status === "completed" || status === "ready" || status === "done") {
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error(`AimlFluxKontext: completed but no image URL in response`);
    return imageUrl;
  }

  if (status === "error" || status === "failed") {
    throw new Error(`AimlFluxKontext task ${generationId} failed: ${data.error?.message ?? status}`);
  }

  // Still processing
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
  const generationId = await submitFluxKontextTask(request);

  // Immediate result (synchronous API response)
  if (generationId.startsWith("done:")) {
    return generationId.slice("done:".length);
  }

  const pollIntervalMs = 4_000;
  const maxAttempts = Math.ceil(maxWaitMs / pollIntervalMs);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const result = await pollFluxKontextTask(generationId);
    if (result) {
      console.log(`[AimlFluxKontext] Done (attempt ${attempt + 1}) → ${result.slice(0, 80)}`);
      return result;
    }
    console.log(`[AimlFluxKontext] Attempt ${attempt + 1}/${maxAttempts} — still processing`);
  }

  throw new Error(`AimlFluxKontext task ${generationId} timed out after ${maxWaitMs}ms`);
}
