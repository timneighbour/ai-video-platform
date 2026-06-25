const AIMLAPI_BASE = "https://api.aimlapi.com";
const MODEL_ID = "bytedance/omnihuman";

function getApiKey(): string {
  const key = process.env.AIML_API_KEY;
  if (!key) throw new Error("AIML_API_KEY environment variable is not set");
  return key;
}

export interface AimlOmniHumanRequest {
  imageUrl: string;
  audioUrl: string;
}

export interface AimlOmniHumanTask {
  generationId: string;
  status: "pending" | "running" | "done" | "failed";
  videoUrl?: string;
  errorMessage?: string;
}

export async function submitAimlOmniHumanTask(request: AimlOmniHumanRequest): Promise<string> {
  const apiKey = getApiKey();
  console.log(`[AimlOmniHuman] Submitting task — image: ${request.imageUrl.slice(0, 80)}, audio: ${request.audioUrl.slice(0, 80)}`);
  const response = await fetch(`${AIMLAPI_BASE}/v2/video/generations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL_ID, image_url: request.imageUrl, audio_url: request.audioUrl }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AimlOmniHuman submit HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as { id?: string; status?: string };
  if (!data.id) throw new Error(`AimlOmniHuman submit: no id in response: ${JSON.stringify(data).slice(0, 300)}`);
  console.log(`[AimlOmniHuman] Task submitted: ${data.id} (status: ${data.status})`);
  return data.id;
}

export async function pollAimlOmniHumanTask(generationId: string): Promise<AimlOmniHumanTask> {
  const apiKey = getApiKey();
  const url = new URL(`${AIMLAPI_BASE}/v2/video/generations`);
  url.searchParams.set("generation_id", generationId);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`AimlOmniHuman poll HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = (await response.json()) as { id?: string; status?: string; video?: { url?: string } | null; error?: { message?: string } | null };
  return {
    generationId: data.id ?? generationId,
    status: mapAimlStatus(data.status ?? "queued"),
    videoUrl: data.video?.url,
    errorMessage: data.error?.message,
  };
}

function mapAimlStatus(raw: string): AimlOmniHumanTask["status"] {
  switch (raw?.toLowerCase()) {
    case "completed": return "done";
    case "error": case "failed": return "failed";
    case "generating": case "queued": return "running";
    default: return "pending";
  }
}
