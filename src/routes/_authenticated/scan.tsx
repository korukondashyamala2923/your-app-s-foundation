import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFoodImage } from "@/lib/food-ai.functions";
import {
  MEAL_TYPES,
  type DetectedItem,
  type MealType,
  dataUrlToBlob,
  fileToCompressedDataUrl,
  guessMealType,
} from "@/lib/nutrition";
import { Camera, ImageIcon, Loader2, Sparkles, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan a Meal — CalorieSnap" },
      { name: "description", content: "Snap or upload a food photo to estimate its calories instantly." },
      { property: "og:title", content: "Scan a Meal — CalorieSnap" },
      { property: "og:description", content: "Snap or upload a food photo to estimate its calories instantly." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const analyze = useServerFn(analyzeFoodImage);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + (Number(i.calories) || 0), 0);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setImageDataUrl(dataUrl);
      setItems([]);
      setAnalyzing(true);
      const result = await analyze({ data: { imageDataUrl: dataUrl } });
      if (!result.items.length) {
        toast.error("No food detected. Try another photo or add items manually.");
      }
      setItems(result.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyze the photo");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateItem(index: number, patch: Partial<DetectedItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  async function saveMeal() {
    if (!items.length) {
      toast.error("Add at least one food item");
      return;
    }
    setSaving(true);
    try {
      let imagePath: string | null = null;
      if (imageDataUrl) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("meal-images")
          .upload(path, dataUrlToBlob(imageDataUrl), { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const { data: meal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          image_path: imagePath,
          meal_type: mealType,
          total_calories: total,
          eaten_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (mealError) throw mealError;

      const { error: itemsError } = await supabase.from("meal_items").insert(
        items.map((i) => ({
          meal_id: meal.id,
          user_id: user.id,
          name: i.name,
          quantity: i.quantity,
          calories: Math.round(Number(i.calories) || 0),
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
          confidence: i.confidence,
        })),
      );
      if (itemsError) throw itemsError;

      await queryClient.invalidateQueries({ queryKey: ["meals", user.id] });
      toast.success(`Logged ${total} kcal`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the meal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Scan a meal" subtitle="Snap it, we'll count it">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {imageDataUrl ? (
          <img src={imageDataUrl} alt="Selected meal" className="h-56 w-full object-cover" />
        ) : (
          <div className="grid h-56 place-items-center bg-secondary/50 text-center">
            <div>
              <Camera className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 px-8 text-sm text-muted-foreground">
                Take a photo of your plate or pick one from your gallery
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 p-3">
          <Button onClick={() => cameraRef.current?.click()} disabled={analyzing}>
            <Camera className="mr-2 h-4 w-4" /> Camera
          </Button>
          <Button variant="secondary" onClick={() => galleryRef.current?.click()} disabled={analyzing}>
            <ImageIcon className="mr-2 h-4 w-4" /> Gallery
          </Button>
        </div>
      </div>

      {analyzing ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Recognizing food…
        </div>
      ) : null}

      {items.length > 0 || (imageDataUrl && !analyzing) ? (
        <section className="mt-5 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Meal</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setMealType(t)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold capitalize transition-colors ${
                    mealType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={index} className="rounded-2xl border border-border bg-card p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    className="h-9 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                  />
                  <button
                    aria-label="Remove item"
                    onClick={() => setItems((p) => p.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Input
                    value={item.quantity}
                    placeholder="Portion"
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    className="h-9 text-sm"
                  />
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={item.calories}
                      onChange={(e) => updateItem(index, { calories: Number(e.target.value) })}
                      className="h-9 pr-11 text-sm"
                    />
                    <span className="pointer-events-none absolute right-3 top-2 text-xs text-muted-foreground">
                      kcal
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() =>
                setItems((p) => [
                  ...p,
                  { name: "", quantity: "1 serving", calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, confidence: 1 },
                ])
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground"
            >
              <Plus className="h-4 w-4" /> Add item manually
            </button>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Meal total
            </span>
            <span className="text-lg font-bold tabular-nums text-foreground">{total} kcal</span>
          </div>

          <Button className="w-full" size="lg" onClick={saveMeal} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add to today's total
          </Button>
        </section>
      ) : null}
    </AppShell>
  );
}
