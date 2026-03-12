import { MacroBar } from "./MacroBar";
import { Card } from "@/components/ui/Card";
import type { NutritionGoals } from "@/types";
import type { DayNutrition } from "@/lib/db/meals";

type Props = {
  nutrition: DayNutrition;
  goals: NutritionGoals;
};

export function NutritionDashboard({ nutrition, goals }: Props) {
  const calPct = goals.calories > 0
    ? Math.round((nutrition.calories / goals.calories) * 100)
    : 0;

  return (
    <Card className="mb-5">
      {/* Calories headline */}
      <div className="text-center mb-4">
        <p className="text-4xl font-bold font-data text-signal">
          {Math.round(nutrition.calories)}
        </p>
        <p className="text-xs text-ink-30 font-data">
          / {goals.calories} kcal ({calPct}%)
        </p>
      </div>

      {/* Macro bars */}
      <div className="space-y-3">
        <MacroBar
          label="Proteínas"
          current={nutrition.protein}
          goal={goals.protein}
          color="#2563EB"
        />
        <MacroBar
          label="Carbohidratos"
          current={nutrition.carbs}
          goal={goals.carbs}
          color="#D97706"
        />
        <MacroBar
          label="Grasas"
          current={nutrition.fat}
          goal={goals.fat}
          color="#7C3AED"
        />
      </div>
    </Card>
  );
}
