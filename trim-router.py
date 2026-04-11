"""
Removes the batch regeneration + master portrait procedures from musicVideo.ts.
These have been moved to batchRegen.ts.

Lines to remove (1-indexed):
  1920..2207 inclusive  (batch comment through the router closing '});')
  2208..end             (BatchState types + runBatchRegeneration helper)

After removal, the router closing '});' needs to be added back.
"""

with open("server/routers/musicVideo.ts", "r") as f:
    lines = f.readlines()

print(f"Original: {len(lines)} lines")

# Find the batch section start (0-indexed)
batch_start = None
for i, line in enumerate(lines):
    if "// ─── Batch InstantID Regeneration" in line and batch_start is None:
        batch_start = i
        break

# The router closing '});' is at line 2207 (0-indexed: 2206)
router_close = 2206  # 0-indexed

print(f"batch_start (0-indexed): {batch_start} (line {batch_start+1})")
print(f"router_close (0-indexed): {router_close} (line {router_close+1})")
print(f"Line at batch_start: {repr(lines[batch_start][:80])}")
print(f"Line at router_close: {repr(lines[router_close][:80])}")

# Build new content:
# - Keep lines before batch section
# - Add the router closing '});' back
# - Drop everything from batch_start to end (the state machine helpers are also removed)
new_lines = lines[:batch_start] + ["});\n"]

print(f"New: {len(new_lines)} lines")

with open("server/routers/musicVideo.ts", "w") as f:
    f.writelines(new_lines)

print("Done.")
