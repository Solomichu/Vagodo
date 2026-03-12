import { useState } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2, UtensilsCrossed, Sparkles } from "lucide-react";
import { FoodItemCard } from "./FoodItemCard";
import { AddFoodModal } from "./AddFoodModal";
import { getMealLabel, getMealEmoji, deletePlate } from "@/lib/db/meals";
import type { FoodItem, MealType } from "@/types";

type Props = {
  mealType: MealType;
  items: FoodItem[];
  date: string;
};

type PlateGroup = {
  plateId: string;
  plateName: string;
  items: FoodItem[];
};

function groupByPlate(items: FoodItem[]): { plates: PlateGroup[]; standalone: FoodItem[] } {
  const plateMap = new Map<string, FoodItem[]>();
  const standalone: FoodItem[] = [];

  for (const item of items) {
    if (item.plateId) {
      const group = plateMap.get(item.plateId) || [];
      group.push(item);
      plateMap.set(item.plateId, group);
    } else {
      standalone.push(item);
    }
  }

  const plates: PlateGroup[] = [];
  for (const [plateId, plateItems] of plateMap) {
    plates.push({
      plateId,
      plateName: plateItems[0]?.plateName || "Plato",
      items: plateItems,
    });
  }

  return { plates, standalone };
}

function PlateCard({ plate }: { plate: PlateGroup }) {
  const [open, setOpen] = useState(false);

  const totals = plate.items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="border-b border-ink-08 last:border-0">
      {/* Plate header - clickable */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2.5"
      >
        <UtensilsCrossed size={12} className="text-signal shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{plate.plateName}</p>
            <Sparkles size={10} className="text-signal shrink-0" />
            <span className="text-[9px] font-data bg-ink-08 px-1.5 py-0.5 rounded-full shrink-0">
              {plate.items.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xs font-data font-bold">{Math.round(totals.calories)} kcal</p>
            <p className="text-[9px] font-data text-ink-30">
              P{Math.round(totals.protein)} C{Math.round(totals.carbs)} G{Math.round(totals.fat)}
            </p>
          </div>
          {open ? (
            <ChevronUp size={12} className="text-ink-30" />
          ) : (
            <ChevronDown size={12} className="text-ink-30" />
          )}
        </div>
      </button>

      {/* Expanded ingredients */}
      {open && (
        <div className="pl-5 pb-2 space-y-0">
          {plate.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 py-1.5 border-b border-ink-08/30 last:border-0"
            >
              <div className="w-1 h-1 rounded-full bg-ink-15 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate">{item.name}</p>
                <p className="text-[9px] font-data text-ink-30">
                  {item.quantity}{item.unit}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-data">{Math.round(item.calories)} kcal</p>
                <p className="text-[8px] font-data text-ink-30">
                  P{Math.round(item.protein)} C{Math.round(item.carbs)} G{Math.round(item.fat)}
                </p>
              </div>
            </div>
          ))}

          {/* Delete plate */}
          <button
            onClick={() => deletePlate(plate.plateId)}
            className="flex items-center gap-1 text-[10px] text-ink-15 hover:text-red-400 mt-1 py-1"
          >
            <Trash2 size={10} /> Eliminar plato
          </button>
        </div>
      )}
    </div>
  );
}

export function MealSection({ mealType, items, date }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const totalCal = items.reduce((sum, i) => sum + i.calories, 0);
  const { plates, standalone } = groupByPlate(items);
  const hasItems = items.length > 0;

  return (
    <div className="bg-paper border border-ink-08 rounded-[1.5rem] overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div
          className={`flex items-center gap-2 flex-1 min-w-0 ${hasItems ? "cursor-pointer" : ""}`}
          onClick={() => hasItems && setExpanded(!expanded)}
        >
          <span className="text-lg">{getMealEmoji(mealType)}</span>
          <span className="font-semibold text-sm">{getMealLabel(mealType)}</span>
          {hasItems && (
            <span className="text-[10px] font-data bg-ink-08 px-2 py-0.5 rounded-full">
              {plates.length + standalone.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalCal > 0 && (
            <span className="text-xs font-data font-bold text-signal">
              {Math.round(totalCal)} kcal
            </span>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center justify-center text-signal w-7 h-7 rounded-full hover:bg-signal-light"
          >
            <Plus size={16} />
          </button>
          {hasItems && (
            <button onClick={() => setExpanded(!expanded)} className="text-ink-30">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {hasItems && expanded && (
        <div className="px-4 pb-3">
          {plates.map((plate) => (
            <PlateCard key={plate.plateId} plate={plate} />
          ))}
          {standalone.map((item) => (
            <FoodItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <AddFoodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mealType={mealType}
        date={date}
      />
    </div>
  );
}
