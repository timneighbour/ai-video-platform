// Quick check of FAL_AI_API_KEY in the server environment
const key = process.env.FAL_AI_API_KEY;
console.log("FAL_AI_API_KEY present:", !!key);
console.log("FAL_AI_API_KEY length:", key?.length ?? 0);
console.log("FAL_AI_API_KEY prefix:", key ? key.slice(0, 12) + "..." : "NOT SET");
// fal.ai keys should be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:xxxxxxxx...
const isValidFormat = key && /^[a-f0-9-]{36}:[a-f0-9]+$/.test(key);
console.log("FAL_AI_API_KEY format valid (uuid:hex):", isValidFormat);
