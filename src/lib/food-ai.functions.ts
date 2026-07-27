import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzeFoodImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ imageDataUrl: z.string().startsWith("data:image/").max(8_000_000) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { recognizeFood } = await import("./food-ai.server");
    const items = await recognizeFood(data.imageDataUrl);
    return { items };
  });
