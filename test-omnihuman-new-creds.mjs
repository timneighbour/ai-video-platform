/**
 * Direct test with new BytePlus Vision AI credentials
 */
import { Service } from "@volcengine/openapi";

// New credentials from BytePlus console screenshot
const accessKeyId = "AKAPNTMyNTdkNDdmNTAxNDUyYzhj-OGU2NmQ0ZjQzNDRlYzk";
const secretAccessKey = "TW1ReE9EQmpNbU5sTURNU5HVTJaamszTUdKbE1qRXpPR05pTVRrNU5HUQ==";

console.log("Testing with new credentials...");
console.log("AccessKeyId:", accessKeyId.slice(0, 15) + "...");

const service = new Service({
  host: "cv.byteplusapi.com",
  region: "ap-singapore-1",
  serviceName: "cv",
  accessKeyId,
  secretKey: secretAccessKey,
});

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

  console.log("Response:", JSON.stringify(response).slice(0, 600));

  const err = response?.ResponseMetadata?.Error;
  if (err?.Code === "SignatureDoesNotMatch") {
    console.log("\nAUTH FAILED — signature mismatch");
  } else if (err?.Code === "InvalidAccessKey") {
    console.log(`\nINVALID KEY — ${err.Message}`);
  } else if (err?.Code) {
    console.log(`\nAUTH OK — got expected error: ${err.Code}: ${err.Message}`);
  } else {
    console.log("\nAUTH OK — no error");
  }
} catch (e) {
  console.error("Error:", e.message);
}
