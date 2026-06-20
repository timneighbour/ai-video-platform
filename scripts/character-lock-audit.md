# Character Lock Field Audit

## Fields Tim needs to work:
1. Body build (slim/lean/average/athletic/stocky/muscular)
2. Appearance description (free text: "Long black hair, stunning looks, pop star, green eyes, good tits")
3. Outfit (locked): "Black short dress and classy high heals but sexy"
4. Props/Instruments (locked): e.g. "Sunburst Gibson Les Paul, microphone"
5. Position (locked): e.g. "Standing at microphone, seated behind drum kit"
6. Must Have (locked rules): e.g. "standing at microphone, black leather jacket"
7. Forbidden (locked rules): e.g. "Microphone"

## Data Flow per field:

### UI → Frontend State (CharacterManager.tsx)
- bodyBuild: char.bodyBuild (select dropdown)
- appearance/description: char.lockedDescription (textarea) OR char.aiDescription (for AI chars)
- outfit: char.lockedOutfit (Input field)
- props: char.lockedProps (Input field)
- position: char.lockedPosition (Input field)
- mustHave: char.lockedRules.mustHave (TagInput)
- forbidden: char.lockedRules.forbidden (TagInput)

### Frontend State → saveCharacters mutation (MusicVideoAutopilot.tsx line 2248-2270)
- bodyBuild: ✅ sent as bodyBuild
- lockedDescription: ✅ sent as lockedDescription
- outfit: ⚠️ sent as lockedOutfit: { jacket: c.lockedOutfit } — crammed into jacket field
- props: ⚠️ sent as lockedProps: { instrument: c.lockedProps } — crammed into instrument field
- position: ✅ sent as lockedPosition
- mustHave/forbidden: ✅ sent as lockedRules

### saveCharacters → DB (characters.ts)
- bodyBuild: ✅ stored as bodyBuild column
- lockedDescription: ✅ stored as lockedDescription column
- outfit: stored as lockedOutfit JSON string e.g. '{"jacket":"black dress..."}'
- props: stored as lockedProps JSON string e.g. '{"instrument":"..."}'
- position: ✅ stored as lockedPosition column
- mustHave/forbidden: ✅ stored as lockedRules JSON
- characterVisualDetails: ⚠️ outfit not reliably stored here (priority 1 in preview-core.ts)

### DB → Image Generation Prompt (preview-core.ts)
- bodyBuild: ❌ NOT USED AT ALL in preview-core.ts
- lockedDescription: ✅ used in identityBlock
- outfit: reads characterVisualDetails.outfit (priority 1) → lockedOutfit values (priority 2) → OUTFIT_CONSTRAINTS (priority 3) → lockedDescription (priority 4)
- props: ❌ NOT USED in preview-core.ts
- position: ❌ NOT USED in preview-core.ts
- mustHave: ❌ NOT USED in preview-core.ts
- forbidden: ❌ NOT USED in preview-core.ts (only in negativePrompt via OUTFIT_CONSTRAINTS)

## Gaps to fix:
1. bodyBuild → inject into prompt ("lean, toned figure", "athletic build", etc.)
2. props → inject into prompt ("holding a Sunburst Gibson Les Paul")
3. position → inject into prompt ("standing at microphone")
4. mustHave → inject into prompt as MUST HAVE items
5. forbidden → inject into negativePrompt
6. outfit from lockedOutfit.jacket → ensure it reaches characterVisualDetails.outfit reliably
