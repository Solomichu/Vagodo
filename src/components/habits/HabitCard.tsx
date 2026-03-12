import { Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Habit, HabitEntry } from "@/types";
import { calculateStreak } from "@/lib/db/habits";

type Props = {
  habit: Habit;
  entries: HabitEntry[];
  completed: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function freqLabel(habit: Habit): string {
  const f = habit.frequency ?? "daily";
  if (f === "daily") return "Diario";
  if (f === "weekly") return "Semanal";
  if (f === "custom" && habit.customDays?.length) {
    return habit.customDays.map((d) => DAY_LABELS[d]).join(", ");
  }
  return "Diario";
}

export function HabitCard({ habit, entries, completed, onToggle, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const streak = calculateStreak(entries);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-paper border-2 rounded-[1.5rem] p-4 card-enter ${
        completed ? "border-signal/30" : "border-ink-08"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-ink-15 hover:text-ink-30 touch-none"
        >
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-current rounded" />
            <div className="w-3 h-0.5 bg-current rounded" />
            <div className="w-3 h-0.5 bg-current rounded" />
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 btn-magnetic ${
            completed
              ? "bg-signal border-signal text-white"
              : "border-ink-15 hover:border-ink-30"
          }`}
        >
          {completed && <Check size={16} strokeWidth={3} />}
        </button>

        {/* Emoji */}
        <span className="text-xl">{habit.emoji}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${completed ? "line-through text-ink-30" : ""}`}>
            {habit.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-data text-ink-30">{freqLabel(habit)}</span>
            {streak >= 2 && (
              <span className="text-[10px] font-data text-signal font-bold">
                {streak}d
              </span>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-full hover:bg-ink-08 text-ink-30"
          >
            <MoreHorizontal size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-paper border border-ink-15 rounded-xl shadow-lg z-50 min-w-[120px] overflow-hidden">
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-ink-08"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-ink-08 text-signal"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
