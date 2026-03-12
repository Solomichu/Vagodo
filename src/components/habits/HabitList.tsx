import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { HabitCard } from "./HabitCard";
import { reorderHabits, completeHabit, uncompleteHabit } from "@/lib/db/habits";
import type { Habit, HabitEntry } from "@/types";
import { todayKey } from "@/lib/dates";

type Props = {
  habits: Habit[];
  entries: HabitEntry[];
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  dimmed?: boolean;
};

export function HabitList({ habits, entries, onEdit, onDelete, dimmed }: Props) {
  const today = todayKey();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);
    const reordered = arrayMove(habits, oldIndex, newIndex);
    reorderHabits(reordered.map((h) => h.id));
  };

  const handleToggle = (habitId: string, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteHabit(habitId, today);
    } else {
      completeHabit(habitId, today);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={habits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
        <div className={`space-y-2 ${dimmed ? "opacity-50" : ""}`}>
          {habits.map((habit) => {
            const habitEntries = entries.filter((e) => e.habitId === habit.id);
            const isCompleted = entries.some(
              (e) => e.habitId === habit.id && e.date === today
            );

            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                entries={habitEntries}
                completed={isCompleted}
                onToggle={() => handleToggle(habit.id, isCompleted)}
                onEdit={() => onEdit(habit)}
                onDelete={() => onDelete(habit)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
