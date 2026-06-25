"""
Step 1: Crop the locked Zara masterPortraitUrl to a tight head+shoulders shot
Step 2: Upload the crop to manus CDN
Step 3: Run Flux Kontext Max on the crop with photorealistic enhancement prompt
Step 4: Upload the result to S3 and print the URL
"""
import os, sys, subprocess, json, time
import urllib.request
import urllib.error

# ── Config ──────────────────────────────────────────────────────────────────
MASTER_PORTRAIT_URL = (
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663500868908/"
    "ALJHDNsuNA7bExFuoQZUsx/generated/1782158860646.png"
)
AIML_API_KEY = os.environ.get("AIML_API_KEY", "")
CROP_PATH = "/tmp/zara-head-shoulders-crop.png"
ENHANCED_PATH = "/tmp/zara-head-shoulders-enhanced.png"

# ── Step 1: Download and crop ────────────────────────────────────────────────
print("=== Step 1: Download and crop to head+shoulders ===")
urllib.request.urlretrieve(MASTER_PORTRAIT_URL, "/tmp/zara-master.png")

from PIL import Image
img = Image.open("/tmp/zara-master.png")
w, h = img.size
print(f"Original size: {w}x{h}")

# The portrait is 1024x1024. Zara's head starts near the top.
# Head+shoulders crop: top 0 to ~45% of height (includes necklace), centred.
# For 1024x1024: y=0 to y=460, x=100 to x=924 (slightly wider crop for shoulders)
crop_top = 0
crop_bottom = int(h * 0.45)   # ~460px — just below the necklace
crop_left = int(w * 0.08)     # ~82px
crop_right = int(w * 0.92)    # ~942px

cropped = img.crop((crop_left, crop_top, crop_right, crop_bottom))
# Resize to 768x768 square (pad with grey to maintain aspect ratio)
cropped_resized = cropped.resize((768, 768), Image.LANCZOS)
cropped_resized.save(CROP_PATH, "PNG")
print(f"Cropped to {cropped.size} → resized to 768x768 → saved to {CROP_PATH}")

# ── Step 2: Upload crop to manus CDN ────────────────────────────────────────
print("\n=== Step 2: Upload crop to manus CDN ===")
result = subprocess.run(
    ["manus-upload-file", CROP_PATH],
    capture_output=True, text=True, timeout=120
)
if result.returncode != 0:
    print("Upload stderr:", result.stderr)
    sys.exit(1)

# Parse CDN URL from output
cdn_url = None
for line in result.stdout.splitlines():
    if "CDN URL:" in line or "https://" in line:
        cdn_url = line.split("CDN URL:")[-1].strip() if "CDN URL:" in line else line.strip()
        if cdn_url.startswith("https://"):
            break

if not cdn_url:
    print("Could not find CDN URL in output:", result.stdout)
    sys.exit(1)
print(f"Crop CDN URL: {cdn_url}")

# ── Step 3: Flux Kontext Max — photorealistic enhancement ───────────────────
print("\n=== Step 3: Flux Kontext Max — photorealistic face enhancement ===")
import urllib.request as req
import json as _json

payload = _json.dumps({
    "model": "flux/kontext-max/image-to-image",
    "image_url": cdn_url,
    "prompt": (
        "Photorealistic portrait enhancement. Keep this exact character — same face, "
        "same jet-black straight hair, same features, same black sleeveless dress, "
        "same diamond necklace. Make the skin texture photorealistic, sharpen the eyes "
        "and facial features so they look like a real photograph. Do not distort the face, "
        "do not change the eye shape or position. Professional studio portrait quality."
    ),
    "aspect_ratio": "1:1",
    "safety_tolerance": "2",
    "output_format": "png",
}).encode()

request = req.Request(
    "https://api.aimlapi.com/v1/images/generations",
    data=payload,
    headers={
        "Authorization": f"Bearer {AIML_API_KEY}",
        "Content-Type": "application/json",
    },
    method="POST"
)

try:
    with req.urlopen(request, timeout=120) as resp:
        data = _json.loads(resp.read())
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:500]}")
    sys.exit(1)

enhanced_cdn_url = (
    data.get("data", [{}])[0].get("url") or
    data.get("images", [{}])[0].get("url") or
    data.get("url")
)
if not enhanced_cdn_url:
    print("No URL in response:", _json.dumps(data)[:300])
    sys.exit(1)

print(f"Enhanced image (AI/ML CDN): {enhanced_cdn_url}")

# ── Step 4: Download and upload to S3 ───────────────────────────────────────
print("\n=== Step 4: Download enhanced image and upload to S3 ===")
urllib.request.urlretrieve(enhanced_cdn_url, ENHANCED_PATH)
size = os.path.getsize(ENHANCED_PATH)
print(f"Downloaded: {size} bytes")

# Use tsx to upload via storagePut
upload_script = f"""
import {{ storagePut }} from './server/storage';
const fs = await import('fs');
const buf = fs.readFileSync('{ENHANCED_PATH}');
const {{ url }} = await storagePut(
  'character-refs/900002/zara-headshot-enhanced-kontext-{int(time.time()*1000)}.png',
  buf, 'image/png'
);
console.log('S3_URL:' + url);
"""

with open("/tmp/upload-enhanced.mjs", "w") as f:
    f.write(upload_script)

result2 = subprocess.run(
    ["npx", "tsx", "--input-type=module"],
    input=upload_script,
    capture_output=True, text=True, timeout=60,
    cwd="/home/ubuntu/ai-video-platform"
)
s3_url = None
for line in (result2.stdout + result2.stderr).splitlines():
    if line.startswith("S3_URL:"):
        s3_url = line.replace("S3_URL:", "").strip()

if s3_url:
    print(f"\n✅ Enhanced portrait S3 URL: {s3_url}")
else:
    print("stdout:", result2.stdout[:500])
    print("stderr:", result2.stderr[:500])
    print(f"\n✅ Enhanced portrait (AI/ML CDN, use this): {enhanced_cdn_url}")
