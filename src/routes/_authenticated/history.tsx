import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { MealImage } from "@/components/MealImage";
import { mealHistoryQuery, profileQuery } from "@/lib/queries";
import { dayKey, formatDate, formatTime } from "@/lib/nutrition";
import { BarChart3, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Meal History & Analytics — CalorieSnap" },
      { name: "description", content: "Browse past meals and review your daily calorie trends." },
      { property: "og:title", content: "Meal History & Analytics — CalorieSnap" },
      { property: "og:description", content: "Browse past meals and review your daily calorie trends." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = Route.useRouteContext();
  const { data: meals = [], isLoading } = useQuery(mealHistoryQuery(user.id));
  const { data: profile } = useQuery(profileQuery(user.id));
  const goal = profile?.daily_calorie_goal ?? 2000;
  const [tab, setTab] = useState<"meals" | "analytics">("meals");

  const days = useMemo(() => {
    const map = new Map<string, { key: string; total: number; meals: typeof meals }>();
    for (const m of meals) {
      const k = dayKey(m.eaten_at);
      const entry = map.get(k) ?? { key: k, total: 0, meals: [] as typeof meals };
      entry.total += m.total_calories;
      entry.meals.push(m);
      map.set(k, entry);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [meals]);

  const last7 = useMemo(() => {
    const out: { key: string; label: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d.toISOString());
      out.push({
        key: k,
        label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        total: days.find((x) => x.key === k)?.total ?? 0,
      });
    }
    return out;
  }, [days]);

  const avg = last7.length ? Math.round(last7.reduce((s, d) => s + d.total, 0) / 7) : 0;
  const best = Math.max(...last7.map((d) => d.total), goal);
  const daysOnTrack = last7.filter((d) => d.total > 0 && d.total <= goal).length;

  return (
    <AppShell title="History" subtitle="Your meals and trends">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-secondary/60 p-1">
        {(["meals", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "analytics" ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" /> Last 7 days
            </h2>
            <div className="mt-5 flex h-40 items-end justify-between gap-2">
              {last7.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {d.total || ""}
                  </span>
                  <div
                    className={`w-full rounded-t-lg ${d.total > goal ? "bg-destructive/70" : "bg-primary"}`}
                    style={{ height: `${Math.max((d.total / best) * 110, d.total ? 6 : 2)}px` }}
                  />
                  <span className="text-[11px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Daily avg" value={`${avg}`} />
            <Metric label="On track" value={`${daysOnTrack}/7`} />
            <Metric label="Goal" value={`${goal}`} />
          </div>
        </section>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">No meals logged yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.key}>
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  {formatDate(day.meals[0].eaten_at)}
                </h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {day.total} kcal
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {day.meals.map((meal) => (
                  <article
                    key={meal.id}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <MealImage
                      path={meal.image_path}
                      alt={meal.meal_items[0]?.name ?? meal.meal_type}
                      className="h-14 w-14 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {meal.meal_items.map((i) => i.name).join(", ") || meal.meal_type}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {meal.meal_type} · {formatTime(meal.eaten_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {meal.total_calories}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card py-4">
      <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
