# Preview Image Diagnosis

## Issue 1: Greg's likeness not captured
- Greg has 2 photos (1 primary, 1 secondary) — both are being passed to the image generator
- BUT the scene prompts STILL contain the OLD descriptions: "Greg, Wears a black T-Shirt and plays like he means it!!"
- This is the OLD user-entered style note, NOT the new forensic description
- The `cleanPrompt` change only applies to NEW storyboard generations — these scenes were generated BEFORE the fix
- The stored scene.prompt still has the old character description baked in
- The identity block in the preview generator adds the NEW forensic description on top, but the scene prompt itself contradicts it with the old generic description

## Issue 2: Random extra musicians
- Scene 4: "A sweeping shot from the back of a massive, dark stadium, looking towards the stage" — no character constraint, AI fills in whoever
- Scene 8: "A close-up shot of a guitar fretboard" — no character assignment
- Scene 12: "A dynamic montage of quick cuts: a close-up of a drumstick hitting a cymbal, a bass string vibrating" — no character assignment
- Scenes with characterAssignments=null have no character constraint at all
- The prompt says "the band" or "the stage" which causes AI to generate random musicians

## Fix Plan
1. For scenes with characterAssignments, add "ONLY this person appears" constraint
2. For scenes with null characterAssignments (wide shots), add "EXACTLY 3 band members" constraint
3. Strip old character descriptions from stored prompts when building the image prompt
