/**
 * Test OmniHuman auth using the official @volcengine/openapi SDK
 * which handles HMAC-SHA256 signing automatically
 */
import { Service } from "@volcengine/openapi";

const accessKeyId = "AKAPNzRkMmQxMjYyYzFlNDYzZWI3ZTAzYWNhNTcxODZjN2Q";
const secretAccessKey = "b72d7fb44cad44308ee8837ff6fdeb32";

// Create a service instance for BytePlus Vision AI (cv)
const service = new Service({
  host: "cv.byteplusapi.com",
  region: "ap-singapore-1",
  serviceName: "cv",
  accessKeyId,
  secretKey: secretAccessKey,
});

console.log("Testing OmniHuman auth via Volcengine SDK...");

try {
  const response = await service.fetchOpenAPI({
    Action: "CVGetResult",
    Version: "2024-06-06",
    method: "POST",
    data: {
      req_key: "realman_avatar_picture_omni15_cv",
      task_id: "test-auth-check-12345",
    },
  });

  console.log("HTTP Status: 200");
  console.log("Response:", JSON.stringify(response).slice(0, 600));

  const err = response?.ResponseMetadata?.Error;
  if (err?.Code === "SignatureDoesNotMatch") {
    console.log("\nAUTH FAILED — signature mismatch");
  } else if (err?.Code) {
    console.log(`\nAUTH OK — got expected error: ${err.Code}: ${err.Message}`);
  } else {
    console.log("\nAUTH OK — no error");
  }
} catch (e) {
  console.error("Error:", e.message);
  if (e.response) {
    const text = await e.response.text?.() ?? "";
    console.log("Response body:", text.slice(0, 400));
  }
}
