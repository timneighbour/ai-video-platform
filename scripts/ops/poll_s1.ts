import { pollHeyGenLipSyncV3 } from "./server/ai-apis/heygen-lipsync";

const taskId = 'c7094f2ef2934ca7b29eb5b1c7ead737';
const result = await pollHeyGenLipSyncV3(taskId);
console.log('Scene 1 HeyGen status:', JSON.stringify(result, null, 2));
