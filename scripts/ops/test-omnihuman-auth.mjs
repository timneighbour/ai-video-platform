import crypto from "crypto";
import https from "https";

const CV_HOST = "cv.byteplusapi.com";
const SERVICE = "cv";
const REGION = "ap-singapore-1";
const API_VERSION = "2024-06-06";
const REQ_KEY = "realman_avatar_picture_omni15_cv";

const accessKeyId = process.env.BYTEPLUS_VISION_ACCESS_KEY_ID;
const secretAccessKey = process.env.BYTEPLUS_VISION_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.error("Credentials not set in env");
  process.exit(1);
}

console.log("AccessKeyId:", accessKeyId.slice(0, 12) + "...");

// Test body — poll a fake task ID to test auth
const bodyObj = { req_key: REQ_KEY, task_id: "test-auth-check-12345" };
const bodyStr = JSON.stringify(bodyObj);
const action = "CVGetResult";

// Sign
const now = new Date();
const xDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const shortDate = xDate.slice(0, 8);

const bodyHash = crypto.createHash("sha256").update(bodyStr, "utf8").digest("hex");
const contentType = "application/json";

// Canonical headers — ASCII sorted: content-type < host < x-content-sha256 < x-date
const canonicalHeaders = [
  `content-type:${contentType}`,
  `host:${CV_HOST}`,
  `x-content-sha256:${bodyHash}`,
  `x-date:${xDate}`,
  "",
].join("\n");

const signedHeaders = "content-type;host;x-content-sha256;x-date";
const canonicalQueryString = `Action=${action}&Version=${API_VERSION}`;

const canonicalRequest = [
  "POST",
  "/",
  canonicalQueryString,
  canonicalHeaders,
  signedHeaders,
  bodyHash,
].join("\n");

const credentialScope = `${shortDate}/${REGION}/${SERVICE}/request`;
const canonicalHash = crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex");
const stringToSign = ["HMAC-SHA256", xDate, credentialScope, canonicalHash].join("\n");

const hmac = (key, data) => crypto.createHmac("sha256", key).update(data, "utf8").digest();
const kDate = hmac(secretAccessKey, shortDate);
const kRegion = hmac(kDate, REGION);
const kService = hmac(kRegion, SERVICE);
const kSigning = hmac(kService, "request");
const signature = crypto.createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");

const authorization = `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

console.log("X-Date:", xDate);
console.log("Authorization:", authorization.slice(0, 80) + "...");

const options = {
  hostname: CV_HOST,
  path: `/?Action=${action}&Version=${API_VERSION}`,
  method: "POST",
  headers: {
    "Content-Type": contentType,
    "Host": CV_HOST,
    "X-Content-Sha256": bodyHash,
    "X-Date": xDate,
    "Authorization": authorization,
    "Content-Length": Buffer.byteLength(bodyStr),
  }
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log("\nHTTP Status:", res.statusCode);
    console.log("Response:", data.slice(0, 600));
    const parsed = JSON.parse(data);
    const err = parsed?.ResponseMetadata?.Error;
    if (err?.Code === "SignatureDoesNotMatch") {
      console.log("\nAUTH FAILED — signature mismatch");
    } else if (err?.Code === "InvalidParameter" || err?.Code === "ResourceNotFound" || err?.CodeN === 100002) {
      console.log("\nAUTH OK — credentials valid (task not found is expected)");
    } else if (!err) {
      console.log("\nAUTH OK — no error in response");
    } else {
      console.log("\nUnexpected error:", err.Code, err.Message);
    }
  });
});
req.on("error", e => console.error("Request error:", e.message));
req.write(bodyStr);
req.end();
