import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router";
import { Plus, CalendarDays, ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EntityDetailModal } from "@/components/ui/EntityDetailModal";
import { ProgressRing } from "@/components/habits/ProgressRing";
import { WeekDots } from "@/components/habits/WeekDots";
import { StreakBadge } from "@/components/habits/StreakBadge";
import { ContributionGraph } from "@/components/habits/ContributionGraph";
import { HabitList } from "@/components/habits/HabitList";
import { HabitFormModal } from "@/components/habits/HabitFormModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { shouldShowHabit, deleteHabit, calculateStreak, bestStreak } from "@/lib/db/habits";
import type { Habit } from "@/types";

type NavState = { detailId?: string; detailType?: string } | null;

export function HabitsPage() {
  const location = useLocation();
  const nav = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const today = todayKey();

  useEffect(() => {
    const state = location.state as NavState;
    if (state?.detailId && state?.detailType === "habit") {
      setDetailId(state.detailId);
      nav(".", { replace: true, state: null });
    }
  }, [location.state, nav]);

  const allHabits = useLiveQuery(
    () => db.habits.filter((h) => !h.archivedAt).sortBy("order"),
    []
  );

  const allEntries = useLiveQuery(() => db.habitEntries.toArray(), []);

  if (!allHabits || !allEntries) return null;

  const visibleHabits = allHabits.filter((h) => shouldShowHabit(h, today));
  const otherHabits = allHabits.filter((h) => !shouldShowHabit(h, today));
  const completedCount = visibleHabits.filter((h) =>
    allEntries.some((e) => e.habitId === h.id && e.date === today)
  ).length;

  // Global streak stats
  const totalStreak = allHabits.length > 0
    ? Math.round(
        allHabits.reduce((sum, h) => {
          const hEntries = allEntries.filter((e) => e.habitId === h.id);
          return sum + calculateStreak(hEntries);
        }, 0) / allHabits.length
      )
    : 0;

  const totalBest = allHabits.length > 0
    ? Math.max(
        ...allHabits.map((h) => {
          const hEntries = allEntries.filter((e) => e.habitId === h.id);
          return bestStreak(hEntries);
        })
      )
    : 0;

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormOpen(true);
  };

  const handleDelete = async (habit: Habit) => {
    await deleteHabit(habit.id);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingHabit(null);
  };

  return (
    <PageShell
      title="Hábitos"
      subtitle="Construye tu rutina"
      action={
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> Nuevo
        </Button>
      }
    >
      {allHabits.length > 0 && (
        <div className="flip-container mb-5">
          <div className={`flip-card ${flipped ? "flipped" : ""}`} style={{ minHeight: flipped ? 340 : "auto" }}>
            {/* Front: Summary */}
            <div className="flip-face">
              <Card>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-ink-30 font-medium">Resumen de hoy</span>
                  <button
                    onClick={() => setFlipped(true)}
                    className="flex items-center gap-1 text-[10px] text-signal font-medium px-2 py-1 rounded-full hover:bg-signal-light"
                  >
                    <CalendarDays size={12} />
                    Historial
                  </button>
                </div>
                <div className="flex items-center gap-5">
                  <ProgressRing completed={completedCount} total={visibleHabits.length} size={90} />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium">
                        {completedCount === visibleHabits.length && visibleHabits.length > 0
                          ? "Todos completados"
                          : `${completedCount} de ${visibleHabits.length} hoy`}
                      </p>
                      <StreakBadge current={totalStreak} best={totalBest} />
                    </div>
                    <WeekDots habits={allHabits} entries={allEntries} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Back: Contribution Graph */}
            <div className="flip-back">
              <Card className="h-full">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setFlipped(false)}
                    className="flex items-center gap-1 text-[10px] text-ink-50 font-medium px-2 py-1 rounded-full hover:bg-ink-08"
                  >
                    <ArrowLeft size={12} />
                    Volver
                  </button>
                  <span className="text-[10px] text-ink-30 font-medium">Mapa de actividad</span>
                </div>
                <ContributionGraph />
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Today's habits */}
      {visibleHabits.length > 0 && (
        <HabitList
          habits={visibleHabits}
          entries={allEntries}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Other habits (not scheduled today) */}
      {otherHabits.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink-30 mb-2 px-1">
            No programados hoy &middot; {otherHabits.length}
          </p>
          <HabitList
            habits={otherHabits}
            entries={allEntries}
            onEdit={handleEdit}
            onDelete={handleDelete}
            dimmed
          />
        </div>
      )}

      {allHabits.length === 0 && (
        <div className="text-center text-ink-30 py-16">
          <p className="text-5xl mb-3">🔥</p>
          <p className="font-medium">Aun no tienes habitos</p>
          <p className="text-sm mt-1">Pulsa &ldquo;Nuevo&rdquo; para crear el primero</p>
        </div>
      )}

      <HabitFormModal
        open={formOpen}
        onClose={handleCloseForm}
        editHabit={editingHabit}
      />

      {detailId && (
        <EntityDetailModal
          entityId={detailId}
          entityType="habit"
          onClose={() => setDetailId(null)}
        />
      )}
    </PageShell>
  );
}
