import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { NutritionDashboard } from "@/components/food/NutritionDashboard";
import { MealSection } from "@/components/food/MealSection";
import { AddFoodModal } from "@/components/food/AddFoodModal";
import { EntityDetailModal } from "@/components/ui/EntityDetailModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { getNutritionGoals, calculateDayNutrition, getMealLabel, getMealEmoji } from "@/lib/db/meals";
import type { NutritionGoals, MealType } from "@/types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function FoodPage() {
  const [goals, setGoals] = useState<NutritionGoals>({
    id: "current",
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  });
  const location = useLocation();
  const nav = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addMealType, setAddMealType] = useState<MealType | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const today = todayKey();

  useEffect(() => {
    const state = location.state as { detailId?: string; detailType?: string } | null;
    if (state?.detailId && state?.detailType === "food") {
      setDetailId(state.detailId);
      nav(".", { replace: true, state: null });
    }
  }, [location.state, nav]);

  useEffect(() => {
    getNutritionGoals().then(setGoals);
  }, []);

  const meals = useLiveQuery(
    () => db.meals.where("date").equals(today).toArray(),
    [today]
  );

  const foodItems = useLiveQuery(async () => {
    if (!meals || meals.length === 0) return [];
    const mealIds = meals.map((m) => m.id);
    return db.foodItems.where("mealId").anyOf(mealIds).toArray();
  }, [meals]);

  if (!meals || !foodItems) return null;

  const nutrition = calculateDayNutrition(foodItems);

  const handlePickMeal = (type: MealType) => {
    setPickerOpen(false);
    setAddMealType(type);
  };

  return (
    <PageShell
      title="Comida"
      subtitle="Tracker nutricional"
      action={
        <Button size="sm" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Nuevo
        </Button>
      }
    >
      <NutritionDashboard nutrition={nutrition} goals={goals} />

      {MEAL_ORDER.map((mealType) => {
        const meal = meals.find((m) => m.mealType === mealType);
        const items = meal
          ? foodItems.filter((i) => i.mealId === meal.id)
          : [];

        return (
          <MealSection
            key={mealType}
            mealType={mealType}
            items={items}
            date={today}
          />
        );
      })}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="¿Para qué comida?">
        <div className="space-y-2">
          {MEAL_ORDER.map((type) => (
            <button
              key={type}
              onClick={() => handlePickMeal(type)}
              className="w-full flex items-center gap-3 p-3 rounded-[1.25rem] border border-ink-08 hover:border-ink-15 transition-colors"
            >
              <span className="text-lg">{getMealEmoji(type)}</span>
              <span className="text-sm font-medium">{getMealLabel(type)}</span>
            </button>
          ))}
        </div>
      </Modal>

      {addMealType && (
        <AddFoodModal
          open={!!addMealType}
          onClose={() => setAddMealType(null)}
          mealType={addMealType}
          date={today}
        />
      )}

      {detailId && (
        <EntityDetailModal
          entityId={detailId}
          entityType="food"
          onClose={() => setDetailId(null)}
        />
      )}
    </PageShell>
  );
}
