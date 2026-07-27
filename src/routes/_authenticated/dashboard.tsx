import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { CalorieRing } from "@/components/CalorieRing";
import { MealImage } from "@/components/MealImage";
import { profileQuery, todayMealsQuery } from "@/lib/queries";
import { dayKey, formatTime } from "@/lib/nutrition";
import { Camera, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today's Calories — CalorieSnap" },
      { name: "description", content: "Track today's calories, remaining budget and meals." },
      { property: "og:title", content: "Today's Calories — CalorieSnap" },
      { property: "og:description", content: "Track today's calories, remaining budget and meals." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const today = dayKey(new Date().toISOString());
  const { data: profile } = useQuery(profileQuery(user.id));
  const { data: meals = [], isLoading } = useQuery(todayMealsQuery(user.id, today));

  const consumed = meals.reduce((s, m) => s + m.total_calories, 0);
  const goal = profile?.daily_calorie_goal ?? 2000;
  const firstName = (profile?.name || user.email?.split("@")[0] || "there").split(" ")[0];

  return (
    <AppShell title={`Hi, ${firstName}`} subtitle="Here's your day so far">
      <section className="flex flex-col items-center rounded-3xl border border-border bg-card p-6 shadow-sm">
        <CalorieRing consumed={consumed} goal={goal} />
        <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
          <Stat label="Meals" value={String(meals.length)} />
          <Stat label="Eaten" value={`${consumed}`} />
          <Stat label="Goal" value={`${goal}`} />
        </div>
      </section>

      <Link
        to="/scan"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow-sm active:scale-[0.99]"
      >
        <Camera className="h-5 w-5" /> Scan a meal
      </Link>

      <h2 className="mt-7 text-base font-semibold text-foreground">Today's meals</h2>
      <div className="mt-3 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : meals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <Flame className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              No meals logged yet. Snap your first plate!
            </p>
          </div>
        ) : (
          meals.map((meal) => (
            <article
              key={meal.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <MealImage
                path={meal.image_path}
                alt={meal.meal_items[0]?.name ?? meal.meal_type}
                className="h-16 w-16 shrink-0 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize text-foreground">
                  {meal.meal_items.map((i) => i.name).join(", ") || meal.meal_type}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {meal.meal_type} · {formatTime(meal.eaten_at)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-secondary-foreground">
                {meal.total_calories}
              </span>
            </article>
          ))
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 py-3">
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
