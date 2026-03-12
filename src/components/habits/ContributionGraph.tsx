import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Check, X as XIcon } from "lucide-react";
import { db } from "@/lib/db";
import { todayKey, formatDateShort } from "@/lib/dates";
import { getDayOfWeek, getISOWeekRange, shouldShowHabit } from "@/lib/db/habits";

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Red (#EF4444) → Yellow (#EAB308) → Green (#22C55E)
const RED = [239, 68, 68];
const YELLOW = [234, 179, 8];
const GREEN = [34, 197, 94];

function lerp(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function heatColor(ratio: number | null): string {
  if (ratio === null) return "rgba(17,17,17,0.03)";
  if (ratio < 0) return "rgba(17,17,17,0.03)"; // no habits scheduled
  if (ratio === 0) return "rgba(17,17,17,0.05)";
  const rgb = ratio <= 0.5
    ? lerp(RED, YELLOW, ratio / 0.5)
    : lerp(YELLOW, GREEN, (ratio - 0.5) / 0.5);
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

function textColorForHeat(ratio: number | null): string {
  if (ratio === null || ratio <= 0) return "rgba(17,17,17,0.3)";
  if (ratio <= 0.25) return "rgba(255,255,255,0.9)";
  if (ratio <= 0.6) return "rgba(17,17,17,0.7)";
  return "rgba(255,255,255,0.95)";
}

// Legend: 5 evenly spaced ratios
const LEGEND_RATIOS = [0, 0.25, 0.5, 0.75, 1];

export function ContributionGraph() {
  const today = todayKey();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.archivedAt).toArray(),
    []
  );

  const extStart = todayKey(new Date(viewYear, viewMonth, -5));
  const extEnd = todayKey(new Date(viewYear, viewMonth + 1, 7));

  const entries = useLiveQuery(
    () =>
      db.habitEntries
        .where("date")
        .between(extStart, extEnd, true, true)
        .toArray(),
    [extStart, extEnd]
  );

  function getScheduledForDay(dateStr: string): number {
    if (!habits) return 0;
    return habits.filter((h) => shouldShowHabit(h, dateStr)).length;
  }

  function getCompletedForDay(dateStr: string): number {
    if (!habits || !entries) return 0;
    const { start: wStart, end: wEnd } = getISOWeekRange(dateStr);
    const dow = getDayOfWeek(dateStr);

    const dayLogIds = new Set(
      entries.filter((l) => l.date === dateStr).map((l) => l.habitId)
    );
    const weekLogIds = new Set(
      entries
        .filter((l) => l.date >= wStart && l.date <= wEnd)
        .map((l) => l.habitId)
    );

    return habits.filter((h) => {
      if (!shouldShowHabit(h, dateStr)) return false;
      const freq = h.frequency ?? "daily";
      if (freq === "daily") return dayLogIds.has(h.id);
      if (freq === "weekly") return weekLogIds.has(h.id);
      if (freq === "custom") {
        const isScheduled = (h.customDays ?? []).includes(dow);
        return isScheduled && dayLogIds.has(h.id);
      }
      return false;
    }).length;
  }

  function isHabitDoneOnDay(habitId: string, dateStr: string): boolean {
    if (!entries) return false;
    const habit = habits?.find((h) => h.id === habitId);
    if (!habit) return false;
    const freq = habit.frequency ?? "daily";

    if (freq === "daily" || freq === "custom") {
      return entries.some((e) => e.habitId === habitId && e.date === dateStr);
    }
    if (freq === "weekly") {
      const { start: wStart, end: wEnd } = getISOWeekRange(dateStr);
      return entries.some(
        (e) => e.habitId === habitId && e.date >= wStart && e.date <= wEnd
      );
    }
    return false;
  }

  // Build ratio map (scheduled-aware)
  const ratioByDate = new Map<string, number>();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  if (entries && habits) {
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (dateStr > today) break;
      const scheduled = getScheduledForDay(dateStr);
      if (scheduled === 0) {
        ratioByDate.set(dateStr, -1); // no habits scheduled → neutral
      } else {
        ratioByDate.set(dateStr, getCompletedForDay(dateStr) / scheduled);
      }
    }
  }

  // Month completion %
  const todayDate = new Date(today + "T00:00:00");
  const isCurrentMonth = todayDate.getFullYear() === viewYear && todayDate.getMonth() === viewMonth;
  const isPastMonth = viewYear < todayDate.getFullYear() || (viewYear === todayDate.getFullYear() && viewMonth < todayDate.getMonth());
  const daysElapsed = isCurrentMonth ? todayDate.getDate() : isPastMonth ? daysInMonth : 0;

  const monthPct = (() => {
    if (daysElapsed === 0) return 0;
    let sum = 0;
    let counted = 0;
    for (let d = 1; d <= daysElapsed; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const r = ratioByDate.get(dateStr) ?? 0;
      if (r >= 0) { // skip days with no scheduled habits
        sum += r;
        counted++;
      }
    }
    return counted > 0 ? Math.round(Math.min(sum / counted, 1) * 100) : 0;
  })();

  function prevMonth() {
    setSelectedDate(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Grid cells
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Selected day detail
  const selectedHabits = selectedDate && habits
    ? habits.filter((h) => shouldShowHabit(h, selectedDate))
    : [];
  const selectedCompleted = selectedDate
    ? selectedHabits.filter((h) => isHabitDoneOnDay(h.id, selectedDate)).length
    : 0;
  const selectedRatio = selectedHabits.length > 0
    ? selectedCompleted / selectedHabits.length
    : 0;

  return (
    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center gap-1">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-ink-08 text-ink-30">
          <ChevronLeft size={14} />
        </button>
        <span className="flex-1 text-center text-xs font-semibold text-ink-50">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>

        {(habits?.length ?? 0) > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-ink-08 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${monthPct}%`,
                  backgroundColor: heatColor(monthPct / 100) ?? "transparent",
                }}
              />
            </div>
            <span className="text-[10px] font-data text-ink-30 w-7 text-right">
              {monthPct}%
            </span>
          </div>
        )}

        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-ink-08 text-ink-30">
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-[3px]">
        {DAY_LABELS.map((d) => (
          <div key={d} className="h-5 flex items-center justify-center text-[9px] font-data font-semibold text-ink-30">
            {d}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e-${idx}`} className="aspect-square rounded-[5px]" />;
          }

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isFuture = dateStr > today;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const ratio: number | null = isFuture ? null : (ratioByDate.get(dateStr) ?? 0);

          return (
            <button
              key={dateStr}
              disabled={isFuture}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={[
                "aspect-square rounded-[5px] flex items-center justify-center text-[9px] font-data select-none transition-all duration-200",
                isSelected ? "ring-2 ring-ink ring-offset-1 ring-offset-paper scale-110" : "",
                isToday && !isSelected ? "ring-1 ring-ink-30 ring-offset-1 ring-offset-paper" : "",
                isFuture ? "opacity-30 cursor-default" : "cursor-pointer active:scale-95",
              ].join(" ")}
              style={{
                backgroundColor: heatColor(ratio),
                color: textColorForHeat(ratio),
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 pt-0.5">
        <span className="text-[9px] text-ink-30">0%</span>
        {LEGEND_RATIOS.map((r, i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-[3px]"
            style={{ backgroundColor: heatColor(r) }}
          />
        ))}
        <span className="text-[9px] text-ink-30">100%</span>
      </div>

      {/* ── Day detail panel ── */}
      {selectedDate && habits && (
        <div className="border-t border-ink-08 pt-3 space-y-2 animate-slide-down">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">
              {formatDateShort(selectedDate)}
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-data font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: heatColor(selectedRatio) ?? "#ccc" }}
              >
                {selectedCompleted}/{selectedHabits.length}
              </span>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-0.5 rounded-full hover:bg-ink-08 text-ink-30"
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>

          {selectedHabits.length === 0 ? (
            <p className="text-[11px] text-ink-30 py-2">Sin hábitos programados este día</p>
          ) : (
            <div className="space-y-1">
              {selectedHabits.map((h) => {
                const done = isHabitDoneOnDay(h.id, selectedDate);
                return (
                  <div
                    key={h.id}
                    className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition-colors ${
                      done ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        done ? "bg-green-500 text-white" : "bg-red-400 text-white"
                      }`}
                    >
                      {done ? <Check size={10} /> : <XIcon size={10} />}
                    </div>
                    <span className="text-sm flex-1 min-w-0 truncate">
                      {h.emoji && <span className="mr-1">{h.emoji}</span>}
                      {h.title}
                    </span>
                    <span className={`text-[10px] font-data font-medium ${done ? "text-green-600" : "text-red-400"}`}>
                      {done ? "Hecho" : "Faltó"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
