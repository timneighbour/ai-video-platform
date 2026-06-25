import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { submitAimlOmniHumanTask, pollAimlOmniHumanTask } from "../ai-apis/aimlapi-omnihuman";

export const omniHumanRouter = router({
  submit: protectedProcedure
    .input(z.object({ imageUrl: z.string().url(), audioUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        const generationId = await submitAimlOmniHumanTask({ imageUrl: input.imageUrl, audioUrl: input.audioUrl });
        return { generationId };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `OmniHuman submit failed: ${err instanceof Error ? err.message : String(err)}` });
      }
    }),
  poll: protectedProcedure
    .input(z.object({ generationId: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await pollAimlOmniHumanTask(input.generationId);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `OmniHuman poll failed: ${err instanceof Error ? err.message : String(err)}` });
      }
    }),
});
