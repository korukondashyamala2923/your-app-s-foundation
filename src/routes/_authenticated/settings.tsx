import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { Loader2, LogOut, Target, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CalorieSnap" },
      { name: "description", content: "Adjust your calorie goal and account preferences." },
      { property: "og:title", content: "Settings — CalorieSnap" },
      { property: "og:description", content: "Adjust your calorie goal and account preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user.id));
  const [goal, setGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const value = goal ?? profile?.daily_calorie_goal?.toString() ?? "2000";

  async function saveGoal() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, daily_calorie_goal: Number(value) || 2000 });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Goal updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update goal");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Settings" subtitle="Preferences and account">
      <section className="rounded-3xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="h-4 w-4 text-primary" /> Daily calorie goal
        </h2>
        <div className="mt-3 flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setGoal(e.target.value)}
          />
          <Button onClick={saveGoal} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[1500, 1800, 2000, 2500].map((g) => (
            <button
              key={g}
              onClick={() => setGoal(String(g))}
              className="rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground"
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <div className="mt-3 space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
          <p className="truncate text-sm text-foreground">{user.email}</p>
        </div>
        <Button variant="ghost" className="mt-4 w-full justify-start text-destructive" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Log out
        </Button>
      </section>

      <section className="mt-4 rounded-3xl border border-dashed border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="h-4 w-4 text-primary" /> About
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          CalorieSnap estimates calories from meal photos using AI. Estimates are approximate —
          always adjust items before saving when portions differ.
        </p>
      </section>
    </AppShell>
  );
}
