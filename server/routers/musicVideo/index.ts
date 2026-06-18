/**
 * musicVideo/index.ts — merges all domain sub-routers into the single
 * musicVideoRouter that routers.ts expects.
 * All trpc.musicVideo.* calls continue to work unchanged.
 */
import { router } from "../../_core/trpc";
import { musicVideoJobRouter } from "./job";
import { musicVideoSceneRouter } from "./scene";
import { musicVideoRenderRouter } from "./render";
import { musicVideoCharacterRouter } from "./character";
import { musicVideoProbeRouter } from "./probe";
import { musicVideoVocalRouter } from "./vocal";

export const musicVideoRouter = router({
  ...musicVideoJobRouter._def.procedures,
  ...musicVideoSceneRouter._def.procedures,
  ...musicVideoRenderRouter._def.procedures,
  ...musicVideoCharacterRouter._def.procedures,
  ...musicVideoProbeRouter._def.procedures,
  ...musicVideoVocalRouter._def.procedures,
});

export type { AppRouter } from '../../routers';
