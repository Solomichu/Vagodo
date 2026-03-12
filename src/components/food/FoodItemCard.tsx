import { Trash2, Sparkles } from "lucide-react";
import { deleteFoodItem } from "@/lib/db/meals";
import type { FoodItem } from "@/types";

type Props = {
  item: FoodItem;
};

export function FoodItemCard({ item }: Props) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-08 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium truncate">{item.name}</p>
          {item.estimatedByAi && (
            <Sparkles size={10} className="text-signal shrink-0" />
          )}
        </div>
        <p className="text-[10px] font-data text-ink-30">
          {item.quantity}{item.unit}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-data font-bold">{Math.round(item.calories)} kcal</p>
        <p className="text-[9px] font-data text-ink-30">
          P{Math.round(item.protein)} C{Math.round(item.carbs)} G{Math.round(item.fat)}
        </p>
      </div>
      <button
        onClick={() => deleteFoodItem(item.id)}
        className="p-1 rounded-full hover:bg-ink-08 text-ink-15"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
