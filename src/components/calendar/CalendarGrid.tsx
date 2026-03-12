import { todayKey } from "@/lib/dates";
import type { CalendarEvent } from "@/types";

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  events: CalendarEvent[];
  month: Date;
  onChangeMonth: (delta: number) => void;
};

const DAY_HEADERS = ["L", "M", "X", "J", "V", "S", "D"];

function getMonthDays(month: Date) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const lastDay = new Date(year, m + 1, 0);

  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

  const days: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push(dateStr);
  }
  return days;
}

export function CalendarGrid({ selectedDate, onSelectDate, events, month, onChangeMonth }: Props) {
  const today = todayKey();
  const days = getMonthDays(month);
  const monthLabel = month.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <div className="bg-paper rounded-[2rem] border border-ink-15 p-5 mb-5">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onChangeMonth(-1)} className="p-2 rounded-full hover:bg-ink-08 text-ink-50">
          ‹
        </button>
        <h3 className="font-bold capitalize">{monthLabel}</h3>
        <button onClick={() => onChangeMonth(1)} className="p-2 rounded-full hover:bg-ink-08 text-ink-50">
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-data text-ink-30">
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} />;

          const dayNum = parseInt(dateStr.split("-")[2]);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasEvents = events.some((e) => e.date === dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative aspect-square rounded-xl flex items-center justify-center text-sm font-medium ${
                isSelected
                  ? "bg-signal text-white"
                  : isToday
                  ? "bg-signal-light text-signal font-bold"
                  : "hover:bg-ink-08"
              }`}
            >
              {dayNum}
              {hasEvents && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-signal" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
