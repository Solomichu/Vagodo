import { todayKey, getWeekDays } from "@/lib/dates";
import type { HabitEntry, Habit } from "@/types";
import { shouldShowHabit } from "@/lib/db/habits";

type Props = {
  habits: Habit[];
  entries: HabitEntry[];
};

const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];

export function WeekDots({ habits, entries }: Props) {
  const days = getWeekDays();
  const today = todayKey();

  return (
    <div className="flex gap-2 justify-center">
      {days.map((day, i) => {
        const scheduled = habits.filter((h) => shouldShowHabit(h, day));
        const completed = scheduled.filter((h) =>
          entries.some((e) => e.habitId === h.id && e.date === day)
        );

        const isToday = day === today;
        const ratio = scheduled.length > 0 ? completed.length / scheduled.length : 0;

        let dotColor = "bg-ink-08";
        if (ratio > 0 && ratio < 1) dotColor = "bg-signal/40";
        if (ratio >= 1) dotColor = "bg-signal";

        return (
          <div key={day} className="flex flex-col items-center gap-1">
            <div
              className={`w-3 h-3 rounded-full ${dotColor} ${
                isToday ? "ring-2 ring-signal ring-offset-1 ring-offset-surface" : ""
              }`}
            />
            <span className={`text-[9px] font-data ${isToday ? "text-signal font-bold" : "text-ink-30"}`}>
              {dayLabels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
