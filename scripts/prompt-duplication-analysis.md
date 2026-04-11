# Prompt Duplication Bug Analysis

## What's happening:
1. The LLM system prompt tells it to "Copy their FIXED APPEARANCE description verbatim into the scene prompt"
2. So the LLM includes the character description in its `prompt` output
3. Then our post-processing code (lines 469-487 of music-video-service.ts) ALSO prepends the character description
4. Result: the description appears TWICE in the stored prompt

## The duplication check is insufficient:
```js
if (!promptLower.startsWith(firstCharName)) {
  finalPrompt = `${characterPrefixes.join(" | ")}\n\n${finalPrompt}`;
}
```
This only checks if the prompt starts with the first character's name. But the LLM often starts with the character name followed by different phrasing, or the LLM may include the description mid-prompt.

## Two approaches to fix:
### Option A: Don't tell the LLM to copy descriptions — let post-processing handle it
- Remove "Copy their FIXED APPEARANCE description verbatim" from the LLM prompt
- Tell the LLM to write ONLY the scene action/setting/camera
- Our post-processing always prepends the exact character description
- PRO: Clean separation of concerns, no duplication possible
- CON: LLM scene prompts may be less character-aware

### Option B: Don't post-process — trust the LLM
- Remove the post-processing prepend entirely
- Trust the LLM to copy descriptions
- PRO: Simpler code
- CON: LLM often paraphrases or truncates descriptions

### CHOSEN: Option A — it's more reliable
The LLM should focus on scene direction (camera, lighting, action, setting).
Character descriptions are injected mechanically by our code — guaranteed correct.

## Additional issue:
The scene prompt shown to users in the UI includes the full character description prefix.
This is verbose and ugly. We should:
- Store TWO versions: `prompt` (clean, user-visible) and `renderPrompt` (with character descriptions for the AI)
- OR: strip the character prefix from the displayed prompt on the frontend
