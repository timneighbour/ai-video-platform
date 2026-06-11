import { pollHeyGenLipSyncV3 } from "./server/ai-apis/heygen-lipsync";

const tasks = [
  { scene: 1, id: "a074f6223a81454ca7fb06f63b0e5bdf" },
  { scene: 2, id: "f957887f1a034cb4a442ec5f407a7068" },
  { scene: 3, id: "918abe675bff4d1685034fc688b0b484" },
  { scene: 4, id: "9138963e26e94816b7ea962d5e1f392c" },
  { scene: 5, id: "c1097635ae0a44a19ca8be77e9400bc2" },
  { scene: 6, id: "57f1e8926ea44f17ad9ed7eed4eb16fc" },
  { scene: 7, id: "d0f2dc276a9b448ba0506413bb190380" },
  { scene: 8, id: "e2523ebba53e45a581bac0fa226b9e38" },
  { scene: 10, id: "599de694c42c4b4289c385dc24fa2851" },
];

async function main() {
  for (const t of tasks) {
    try {
      const result = await pollHeyGenLipSyncV3(t.id);
      const videoFlag = result.videoUrl ? "✅ VIDEO_READY" : "";
      const errFlag = result.error ? `❌ ${result.error}` : "";
      console.log(`Scene ${t.scene} (${t.id.slice(0, 8)}): ${result.status} ${videoFlag}${errFlag}`);
    } catch (e: any) {
      console.log(`Scene ${t.scene}: ERROR ${e.message}`);
    }
  }
}
main();
