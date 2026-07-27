import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Salad } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CalorieSnap — Photo Calorie Tracker" },
      {
        name: "description",
        content:
          "Snap a photo of your meal and CalorieSnap estimates the calories, tracks your daily goal and keeps your meal history.",
      },
      { property: "og:title", content: "CalorieSnap — Photo Calorie Tracker" },
      {
        property: "og:description",
        content: "Snap a photo of your meal and instantly track calories toward your daily goal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate({ to: data.session ? "/dashboard" : "/auth", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary text-primary-foreground">
          <Salad className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-3xl font-bold text-foreground">CalorieSnap</h1>
        <p className="mt-2 text-sm text-muted-foreground">Snap your plate, know your calories.</p>
      </div>
    </main>
  );
}
