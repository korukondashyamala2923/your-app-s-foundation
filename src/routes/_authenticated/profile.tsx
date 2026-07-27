import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { LogOut, Settings, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — CalorieSnap" },
      { name: "description", content: "Manage your body metrics and daily calorie goal." },
      { property: "og:title", content: "Your Profile — CalorieSnap" },
      { property: "og:description", content: "Manage your body metrics and daily calorie goal." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery(profileQuery(user.id));

  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    daily_calorie_goal: "2000",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      age: profile.age?.toString() ?? "",
      gender: profile.gender ?? "",
      height_cm: profile.height_cm?.toString() ?? "",
      weight_kg: profile.weight_kg?.toString() ?? "",
      daily_calorie_goal: profile.daily_calorie_goal?.toString() ?? "2000",
    });
  }, [profile]);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        name: form.name.trim() || "Friend",
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        daily_calorie_goal: Number(form.daily_calorie_goal) || 2000,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
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
    <AppShell
      title="Profile"
      subtitle={user.email ?? undefined}
      action={
        <Link
          to="/settings"
          aria-label="Settings"
          className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-secondary-foreground"
        >
          <Settings className="h-5 w-5" />
        </Link>
      }
    >
      <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <Field label="Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <Input
              type="number"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </Field>
          <Field label="Gender">
            <Input
              value={form.gender}
              placeholder="e.g. female"
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)">
            <Input
              type="number"
              inputMode="numeric"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              type="number"
              inputMode="decimal"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Daily calorie goal">
          <Input
            type="number"
            inputMode="numeric"
            value={form.daily_calorie_goal}
            onChange={(e) => setForm({ ...form, daily_calorie_goal: e.target.value })}
          />
        </Field>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save profile
        </Button>
      </section>

      <Button variant="ghost" className="mt-4 w-full text-destructive" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" /> Log out
      </Button>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
