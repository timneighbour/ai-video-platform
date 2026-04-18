import type { Express } from "express";
import { ENV } from "./env";
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0] ?? req.path.replace(/^\/manus-storage\//, "");
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      // Stream the asset directly to the client instead of redirecting.
      // iOS Safari has issues with 307 redirects to signed CDN URLs for <img> tags.
      // Streaming also allows us to set proper Cache-Control headers.
      const assetResp = await fetch(url);
      if (!assetResp.ok) {
        res.status(502).send("Asset fetch failed");
        return;
      }
      const contentType = assetResp.headers.get("content-type") ?? "application/octet-stream";
      const contentLength = assetResp.headers.get("content-length");
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      res.set("Access-Control-Allow-Origin", "*");
      if (contentLength) res.set("Content-Length", contentLength);
      if (assetResp.body) {
        const { Readable } = await import("stream");
        const nodeStream = Readable.fromWeb(assetResp.body as any);
        nodeStream.pipe(res);
      } else {
        const buffer = Buffer.from(await assetResp.arrayBuffer());
        res.send(buffer);
      }
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
