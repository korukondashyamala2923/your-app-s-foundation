import type { DetectedItem } from "./nutrition";

const SYSTEM_PROMPT = `You are a nutrition vision expert. Identify each distinct food or drink item visible in the photo and estimate its calories based on the visible portion size.
Rules:
- Only include foods/drinks actually visible.
- Estimate realistic portion sizes (e.g. "1 cup", "150 g", "1 medium").
- Calories are whole numbers for the visible portion.
- confidence is 0-1.
- If no food is visible, return an empty items array.`;

type ToolArgs = { items?: Partial<DetectedItem>[] };

/**
 * Calls the AI provider for food recognition + calorie estimation.
 * Swap the fetch below to plug in a different external food-recognition API.
 */
export async function recognizeFood(imageDataUrl: string): Promise<DetectedItem[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this meal photo and report every food item with calories." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_food_items",
            description: "Report detected food items with nutrition estimates",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "string" },
                      calories: { type: "number" },
                      protein_g: { type: "number" },
                      carbs_g: { type: "number" },
                      fat_g: { type: "number" },
                      confidence: { type: "number" },
                    },
                    required: ["name", "quantity", "calories"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["items"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_food_items" } },
    }),
  });

  if (response.status === 429) throw new Error("Too many requests. Please try again in a moment.");
  if (response.status === 402) throw new Error("AI credits exhausted. Please top up to keep scanning.");
  if (!response.ok) throw new Error(`Food recognition failed (${response.status})`);

  const data = (await response.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const raw = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) return [];

  let parsed: ToolArgs = {};
  try {
    parsed = JSON.parse(raw) as ToolArgs;
  } catch {
    return [];
  }

  return (parsed.items ?? []).map((i) => ({
    name: String(i.name ?? "Unknown food"),
    quantity: String(i.quantity ?? "1 serving"),
    calories: Math.max(0, Math.round(Number(i.calories ?? 0))),
    protein_g: Math.max(0, Number(i.protein_g ?? 0)),
    carbs_g: Math.max(0, Number(i.carbs_g ?? 0)),
    fat_g: Math.max(0, Number(i.fat_g ?? 0)),
    confidence: Math.min(1, Math.max(0, Number(i.confidence ?? 0.7))),
  }));
}
