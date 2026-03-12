import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import { todayKey } from "@/lib/dates";
import type { Meal, FoodItem, MealType, NutritionGoals } from "@/types";

// ─── Meals CRUD ─────────────────────────────────────────────

export async function getOrCreateMeal(mealType: MealType, date?: string): Promise<string> {
  const d = date ?? todayKey();
  const existing = await db.meals
    .where("date")
    .equals(d)
    .and((m) => m.mealType === mealType)
    .first();

  if (existing) return existing.id;

  const id = newId();
  await db.meals.add({ id, date: d, mealType, createdAt: Date.now() });
  return id;
}

export async function addFoodItem(
  mealType: MealType,
  item: Omit<FoodItem, "id" | "mealId">,
  date?: string
): Promise<string> {
  const mealId = await getOrCreateMeal(mealType, date);
  const id = newId();
  await db.foodItems.add({ id, mealId, ...item });
  return id;
}

export async function addPlate(
  mealType: MealType,
  plateName: string,
  ingredients: Omit<FoodItem, "id" | "mealId" | "plateId" | "plateName">[],
  date?: string
): Promise<string> {
  const mealId = await getOrCreateMeal(mealType, date);
  const plateId = newId();
  for (const item of ingredients) {
    const id = newId();
    await db.foodItems.add({ id, mealId, plateId, plateName, ...item });
  }
  return plateId;
}

export async function deletePlate(plateId: string): Promise<void> {
  const items = await db.foodItems.where("plateId").equals(plateId).toArray();
  await db.foodItems.bulkDelete(items.map((i) => i.id));
}

export async function updateFoodItem(
  id: string,
  data: Partial<Omit<FoodItem, "id" | "mealId">>
): Promise<void> {
  await db.foodItems.update(id, data);
}

export async function deleteFoodItem(id: string): Promise<void> {
  await db.foodItems.delete(id);
}

// ─── Nutrition Goals ────────────────────────────────────────

export async function getNutritionGoals(): Promise<NutritionGoals> {
  const goals = await db.nutritionGoals.get("current");
  return goals ?? { id: "current", calories: 2000, protein: 150, carbs: 250, fat: 65 };
}

export async function setNutritionGoals(goals: Omit<NutritionGoals, "id">): Promise<void> {
  await db.nutritionGoals.put({ id: "current", ...goals });
}

// ─── Helpers ────────────────────────────────────────────────

export function getMealLabel(type: MealType): string {
  const labels: Record<MealType, string> = {
    breakfast: "Desayuno",
    lunch: "Comida",
    dinner: "Cena",
    snack: "Snacks",
  };
  return labels[type];
}

export function getMealEmoji(type: MealType): string {
  const emojis: Record<MealType, string> = {
    breakfast: "🌅",
    lunch: "🍽️",
    dinner: "🌙",
    snack: "🍿",
  };
  return emojis[type];
}

export type DayNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function calculateDayNutrition(items: FoodItem[]): DayNutrition {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
