import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { endOfDayISO, startOfDayISO } from "./nutrition";

export type Profile = {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  daily_calorie_goal: number;
};

export type MealItem = {
  id: string;
  name: string;
  quantity: string | null;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export type Meal = {
  id: string;
  image_path: string | null;
  meal_type: string;
  total_calories: number;
  notes: string | null;
  eaten_at: string;
  meal_items: MealItem[];
};

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, age, gender, height_cm, weight_kg, daily_calorie_goal")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

const MEAL_SELECT =
  "id, image_path, meal_type, total_calories, notes, eaten_at, meal_items(id, name, quantity, calories, protein_g, carbs_g, fat_g)";

export const todayMealsQuery = (userId: string, dateKey: string) =>
  queryOptions({
    queryKey: ["meals", userId, "day", dateKey],
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from("meals")
        .select(MEAL_SELECT)
        .gte("eaten_at", startOfDayISO(new Date(dateKey)))
        .lte("eaten_at", endOfDayISO(new Date(dateKey)))
        .order("eaten_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Meal[];
    },
  });

export const mealHistoryQuery = (userId: string) =>
  queryOptions({
    queryKey: ["meals", userId, "history"],
    queryFn: async (): Promise<Meal[]> => {
      const { data, error } = await supabase
        .from("meals")
        .select(MEAL_SELECT)
        .order("eaten_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Meal[];
    },
  });

export const mealImageQuery = (path: string | null) =>
  queryOptions({
    queryKey: ["meal-image", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("meal-images")
        .createSignedUrl(path, 60 * 60);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });
