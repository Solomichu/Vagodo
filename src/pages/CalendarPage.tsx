import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router";
import { Check, Plus } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { EventCard } from "@/components/calendar/EventCard";
import { AddEventForm } from "@/components/calendar/AddEventForm";
import { EntityDetailModal } from "@/components/ui/EntityDetailModal";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { todayKey, formatDateShort } from "@/lib/dates";
import { shouldShowHabit, completeHabit, uncompleteHabit } from "@/lib/db/habits";

type NavState = { detailId?: string; detailType?: string; date?: string } | null;

export function CalendarPage() {
  const location = useLocation();
  const nav = useNavigate();
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [month, setMonth] = useState(new Date());
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as NavState;
    if (state?.detailId && state?.detailType === "event") {
      if (state.date) setSelectedDate(state.date);
      setDetailId(state.detailId);
      nav(".", { replace: true, state: null });
    }
  }, [location.state, nav]);

  const events = useLiveQuery(() => db.calendarEvents.toArray(), []);
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.archivedAt).toArray(),
    []
  );
  const habitEntries = useLiveQuery(
    () => db.habitEntries.toArray(),
    []
  );

  if (!events || !habits || !habitEntries) return null;

  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  // Habits scheduled for this day
  const scheduledHabits = habits.filter((h) => shouldShowHabit(h, selectedDate));
  const pendingHabits = scheduledHabits.filter(
    (h) => !habitEntries.some((e) => e.habitId === h.id && e.date === selectedDate)
  );

  const handleChangeMonth = (delta: number) => {
    setMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  const handleToggleHabit = async (habitId: string) => {
    const isDone = habitEntries.some(
      (e) => e.habitId === habitId && e.date === selectedDate
    );
    if (isDone) {
      await uncompleteHabit(habitId, selectedDate);
    } else {
      await completeHabit(habitId, selectedDate);
    }
  };

  return (
    <PageShell
      title="Agenda"
      subtitle={formatDateShort(selectedDate)}
      action={
        <Button size="sm" onClick={() => setAddEventOpen(true)}>
          <Plus size={16} /> Nuevo
        </Button>
      }
    >
      <CalendarGrid
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        events={events}
        month={month}
        onChangeMonth={handleChangeMonth}
      />

      <div className="space-y-2">
        {dayEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        <AddEventForm date={selectedDate} open={addEventOpen} onClose={() => setAddEventOpen(false)} />
      </div>

      {/* Pending habits for selected day */}
      {pendingHabits.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink-50 mb-2 px-1">
            Hábitos pendientes · {pendingHabits.length}
          </p>
          <div className="space-y-1.5">
            {pendingHabits.map((h) => (
              <button
                key={h.id}
                onClick={() => handleToggleHabit(h.id)}
                className="w-full flex items-center gap-3 bg-paper border border-ink-08 rounded-[1.25rem] p-3 card-enter hover:border-ink-15 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0"
                  style={{ borderColor: h.color ?? "#10b981" }}
                >
                  <span className="text-sm">{h.emoji}</span>
                </div>
                <span className="text-sm font-medium flex-1 text-left truncate">
                  {h.title}
                </span>
                <div className="w-6 h-6 rounded-full border-2 border-ink-15 flex items-center justify-center shrink-0 text-ink-15">
                  <Check size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All done message */}
      {scheduledHabits.length > 0 && pendingHabits.length === 0 && (
        <div className="mt-4 text-center py-3">
          <p className="text-xs text-green-600 font-medium">
            Todos los hábitos completados para este día
          </p>
        </div>
      )}

      {detailId && (
        <EntityDetailModal
          entityId={detailId}
          entityType="event"
          onClose={() => setDetailId(null)}
        />
      )}
    </PageShell>
  );
}
