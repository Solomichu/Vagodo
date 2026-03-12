import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { shouldShowHabit } from "@/lib/db/habits";
import { calculateDayNutrition } from "@/lib/db/meals";

const MOTIVACIONES = [
  "La consistencia transforma lo ordinario en extraordinario.",
  "Tu futuro tú está orgulloso en este momento.",
  "Cada pequeño paso cuenta. Hoy es el día.",
  "No se trata de perfección, se trata de progreso.",
  "Estás rompiendo patrones. Eso duele pero funciona.",
  "Dolor temporal > Arrepentimiento permanente.",
  "Tu cuerpo te agradecerá en 30 días.",
  "El mejor momento para empezar fue ayer. El segundo mejor es ahora.",
];

export function MiniDashboard({ expanded = false }: { expanded?: boolean }) {
  const navigate = useNavigate();
  const today = todayKey();
  const quote = MOTIVACIONES[new Date().getDate() % MOTIVACIONES.length];

  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.archivedAt).toArray(),
    []
  );
  const habitEntries = useLiveQuery(
    () => db.habitEntries.where("date").equals(today).toArray(),
    [today]
  );
  const top3 = useLiveQuery(
    () =>
      db.tasks
        .where("status")
        .equals("today")
        .and((t) => t.todayRank !== undefined)
        .count(),
    []
  );
  const eventsCount = useLiveQuery(
    () => db.calendarEvents.where("date").equals(today).count(),
    [today]
  );
  const meals = useLiveQuery(
    () => db.meals.where("date").equals(today).toArray(),
    [today]
  );
  const foodItems = useLiveQuery(async () => {
    if (!meals || meals.length === 0) return [];
    return db.foodItems
      .where("mealId")
      .anyOf(meals.map((m) => m.id))
      .toArray();
  }, [meals]);

  const dataReady =
    !!habits &&
    !!habitEntries &&
    top3 !== undefined &&
    eventsCount !== undefined &&
    !!foodItems;

  if (!dataReady) return null;

  const visibleHabits = habits.filter((h) => shouldShowHabit(h, today));
  const completedHabits = visibleHabits.filter((h) =>
    habitEntries!.some((e) => e.habitId === h.id)
  ).length;
  const habitPct =
    visibleHabits.length > 0
      ? Math.round((completedHabits / visibleHabits.length) * 100)
      : 0;
  const nutrition = calculateDayNutrition(foodItems!);

  // ── Expanded: 2×2 grid, bigger cards, more detail ──────────
  if (expanded) {
    return (
      <div className="px-4 pt-3 pb-4 space-y-3">
        {/* Quote — prominent */}
        <div className="bg-paper border border-ink-08 rounded-2xl px-5 py-5">
          <p className="font-drama italic text-xl text-ink-50 leading-snug">
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        {/* 2×2 stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Habits */}
          <button
            onClick={() => navigate("/habits")}
            className="bg-paper border border-ink-08 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold font-data text-signal leading-none">
                {completedHabits}
                <span className="text-lg text-ink-20">/{visibleHabits.length}</span>
              </p>
              {visibleHabits.length > 0 && (
                <span className="text-[11px] font-data font-bold text-ink-30">
                  {habitPct}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-ink-50 mt-1.5">Hábitos de hoy</p>
            {visibleHabits.length > 0 && (
              <div className="h-1.5 bg-ink-06 rounded-full overflow-hidden mt-2.5">
                <div
                  className="h-full bg-signal rounded-full"
                  style={{ width: `${habitPct}%` }}
                />
              </div>
            )}
          </button>

          {/* Top 3 */}
          <button
            onClick={() => navigate("/checklist")}
            className="bg-paper border border-ink-08 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
          >
            <p className="text-3xl font-bold font-data leading-none">
              {top3 ?? 0}
              <span className="text-lg text-ink-20">/3</span>
            </p>
            <p className="text-[11px] text-ink-50 mt-1.5">Tareas en foco</p>
            <div className="h-1.5 bg-ink-06 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-ink-50 rounded-full"
                style={{ width: `${Math.min(((top3 ?? 0) / 3) * 100, 100)}%` }}
              />
            </div>
          </button>

          {/* Nutrition */}
          <button
            onClick={() => navigate("/food")}
            className="bg-paper border border-ink-08 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
          >
            <p className="text-3xl font-bold font-data leading-none">
              {Math.round(nutrition.calories)}
            </p>
            <p className="text-[11px] text-ink-50 mt-1.5">kcal consumidas</p>
            <div className="flex gap-3 mt-2.5">
              <span
                className="text-[10px] font-data font-bold"
                style={{ color: "#2563EB" }}
              >
                {Math.round(nutrition.protein)}g P
              </span>
              <span
                className="text-[10px] font-data font-bold"
                style={{ color: "#D97706" }}
              >
                {Math.round(nutrition.carbs)}g C
              </span>
              <span
                className="text-[10px] font-data font-bold"
                style={{ color: "#7C3AED" }}
              >
                {Math.round(nutrition.fat)}g G
              </span>
            </div>
          </button>

          {/* Events */}
          <button
            onClick={() => navigate("/calendar")}
            className="bg-paper border border-ink-08 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
          >
            <p className="text-3xl font-bold font-data leading-none">
              {eventsCount ?? 0}
            </p>
            <p className="text-[11px] text-ink-50 mt-1.5">Eventos hoy</p>
          </button>
        </div>
      </div>
    );
  }

  // ── Compact: 4-column grid, minimal ────────────────────────
  return (
    <div className="px-4 pt-2 space-y-2 pb-2">
      {/* Quote — compact */}
      <div className="bg-paper border border-ink-08 rounded-2xl px-4 py-2.5">
        <p className="font-drama italic text-sm text-ink-50 leading-snug">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {/* 4-col stats grid */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => navigate("/habits")}
          className="bg-paper border border-ink-08 rounded-2xl p-2.5 text-center active:scale-[0.97] transition-transform"
        >
          <p className="text-lg font-bold font-data text-signal leading-none">
            {completedHabits}/{visibleHabits.length}
          </p>
          <p className="text-[9px] text-ink-50 mt-1">Hábitos</p>
        </button>
        <button
          onClick={() => navigate("/checklist")}
          className="bg-paper border border-ink-08 rounded-2xl p-2.5 text-center active:scale-[0.97] transition-transform"
        >
          <p className="text-lg font-bold font-data leading-none">
            {top3 ?? 0}/3
          </p>
          <p className="text-[9px] text-ink-50 mt-1">Foco</p>
        </button>
        <button
          onClick={() => navigate("/food")}
          className="bg-paper border border-ink-08 rounded-2xl p-2.5 text-center active:scale-[0.97] transition-transform"
        >
          <p className="text-lg font-bold font-data leading-none">
            {Math.round(nutrition.calories)}
          </p>
          <p className="text-[9px] text-ink-50 mt-1">kcal</p>
        </button>
        <button
          onClick={() => navigate("/calendar")}
          className="bg-paper border border-ink-08 rounded-2xl p-2.5 text-center active:scale-[0.97] transition-transform"
        >
          <p className="text-lg font-bold font-data leading-none">
            {eventsCount ?? 0}
          </p>
          <p className="text-[9px] text-ink-50 mt-1">Eventos</p>
        </button>
      </div>

      {/* Macros mini row */}
      {nutrition.calories > 0 && (
        <div className="flex items-center gap-4 bg-paper border border-ink-08 rounded-2xl px-4 py-2.5">
          <span className="text-[10px] text-ink-30 font-medium shrink-0">
            Macros
          </span>
          <div className="flex-1 flex justify-around text-center">
            <div>
              <p
                className="font-data font-bold text-xs"
                style={{ color: "#2563EB" }}
              >
                {Math.round(nutrition.protein)}g
              </p>
              <p className="text-[9px] text-ink-30">P</p>
            </div>
            <div>
              <p
                className="font-data font-bold text-xs"
                style={{ color: "#D97706" }}
              >
                {Math.round(nutrition.carbs)}g
              </p>
              <p className="text-[9px] text-ink-30">C</p>
            </div>
            <div>
              <p
                className="font-data font-bold text-xs"
                style={{ color: "#7C3AED" }}
              >
                {Math.round(nutrition.fat)}g
              </p>
              <p className="text-[9px] text-ink-30">G</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
