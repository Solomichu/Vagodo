import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router";
import {
  Check,
  Circle,
  CalendarDays,
  ChevronRight,
  ListChecks,
  Flame,
  Utensils,
} from "lucide-react";
import { db } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { shouldShowHabit } from "@/lib/db/habits";
import { calculateDayNutrition, getNutritionGoals } from "@/lib/db/meals";

// ── Parsing ─────────────────────────────────────────────────

type Segment =
  | { type: "text"; content: string }
  | { type: "ref"; refType: string; refId?: string };

const REF_PATTERN = /\{\{(task|habit|event|tasks|habits|events|nutrition)(?::([^}]+))?\}\}/g;

export function parseSmartContent(content: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  const re = new RegExp(REF_PATTERN.source, REF_PATTERN.flags);
  let match;

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "ref", refType: match[1], refId: match[2] });
    lastIndex = re.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }

  return segments;
}

// ── Inline chips ────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  high: "#E63B2E",
  medium: "#D97706",
  low: "#2563EB",
  none: "rgba(17,17,17,0.2)",
};

function TaskChip({ id }: { id: string }) {
  const task = useLiveQuery(() => db.tasks.get(id), [id]);

  if (!task) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-08 text-[11px] text-ink-30">
        tarea eliminada
      </span>
    );
  }

  const isDone = task.status === "done";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded-xl text-[11px] font-medium border transition-colors ${
        isDone
          ? "bg-green-50 border-green-200 line-through text-ink-30"
          : "bg-paper border-ink-08"
      }`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority ?? "none"] }}
      />
      {task.title}
      {isDone && <Check size={10} className="text-green-500" />}
    </span>
  );
}

function HabitChip({ id }: { id: string }) {
  const today = todayKey();
  const habit = useLiveQuery(() => db.habits.get(id), [id]);
  const entry = useLiveQuery(
    () => db.habitEntries.where("[habitId+date]").equals([id, today]).first(),
    [id, today]
  );

  if (!habit) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-08 text-[11px] text-ink-30">
        habito eliminado
      </span>
    );
  }

  const done = !!entry;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded-xl text-[11px] font-medium border transition-colors ${
        done ? "bg-green-50 border-green-200" : "bg-paper border-ink-08"
      }`}
    >
      {habit.emoji && <span>{habit.emoji}</span>}
      {habit.title}
      {done ? (
        <Check size={10} className="text-green-500" />
      ) : (
        <Circle size={10} className="text-ink-30" />
      )}
    </span>
  );
}

function EventChip({ id }: { id: string }) {
  const event = useLiveQuery(() => db.calendarEvents.get(id), [id]);

  if (!event) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ink-08 text-[11px] text-ink-30">
        evento eliminado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded-xl text-[11px] font-medium bg-paper border border-ink-08">
      <CalendarDays size={10} className="text-signal" />
      {event.startTime && (
        <span className="font-data text-ink-50">{event.startTime}</span>
      )}
      {event.title}
    </span>
  );
}

// ── Block summary cards (interactive, navigate on tap) ──────

function TasksSummary() {
  const navigate = useNavigate();
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .where("status")
        .equals("today")
        .and((t) => t.todayRank !== undefined)
        .sortBy("todayRank"),
    []
  );

  const isEmpty = !tasks || tasks.length === 0;
  const doneCount = tasks?.filter((t) => t.status === "done").length ?? 0;

  return (
    <div
      onClick={() => navigate("/checklist")}
      className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-150 border border-signal/15 shadow-sm my-1.5"
    >
      <div className="bg-signal/5 px-3.5 py-2.5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-signal/12 flex items-center justify-center shrink-0">
          <ListChecks size={14} className="text-signal" />
        </div>
        <span className="text-[11px] font-bold text-signal/80 uppercase tracking-wider flex-1">
          Top 3
        </span>
        {!isEmpty && (
          <span className="text-[10px] font-data font-bold text-signal/60">
            {doneCount}/{tasks.length}
          </span>
        )}
        <ChevronRight size={14} className="text-ink-20 shrink-0" />
      </div>
      <div className="bg-paper">
        {isEmpty ? (
          <div className="px-4 py-3">
            <p className="text-[12px] text-ink-30">Sin tareas en foco</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-04">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="px-4 py-2.5 flex items-center gap-2.5"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: PRIORITY_COLORS[t.priority ?? "none"],
                  }}
                />
                <span
                  className={`text-[13px] flex-1 truncate ${
                    t.status === "done"
                      ? "line-through text-ink-30"
                      : "text-ink"
                  }`}
                >
                  {t.title}
                </span>
                {t.status === "done" && (
                  <Check size={13} className="text-green-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HabitsSummary() {
  const navigate = useNavigate();
  const today = todayKey();
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.archivedAt).toArray(),
    []
  );
  const entries = useLiveQuery(
    () => db.habitEntries.where("date").equals(today).toArray(),
    [today]
  );

  if (!habits || !entries) return null;

  const visible = habits.filter((h) => shouldShowHabit(h, today));
  const completed = visible.filter((h) =>
    entries.some((e) => e.habitId === h.id)
  );
  const pct =
    visible.length > 0
      ? Math.round((completed.length / visible.length) * 100)
      : 0;
  const isEmpty = visible.length === 0;

  return (
    <div
      onClick={() => navigate("/habits")}
      className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-150 border border-emerald-200/60 shadow-sm my-1.5"
    >
      <div className="bg-emerald-50 px-3.5 py-2.5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Flame size={14} className="text-emerald-600" />
        </div>
        <span className="text-[11px] font-bold text-emerald-700/80 uppercase tracking-wider flex-1">
          Hábitos
        </span>
        {!isEmpty && (
          <span className="text-[10px] font-data font-bold text-emerald-600/70">
            {completed.length}/{visible.length} &middot; {pct}%
          </span>
        )}
        <ChevronRight size={14} className="text-ink-20 shrink-0" />
      </div>
      <div className="bg-paper">
        {isEmpty ? (
          <div className="px-4 py-3">
            <p className="text-[12px] text-ink-30">Sin hábitos para hoy</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-ink-04">
              {visible.map((h) => {
                const done = entries.some((e) => e.habitId === h.id);
                return (
                  <div
                    key={h.id}
                    className="px-4 py-2.5 flex items-center gap-2.5"
                  >
                    {done ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <Check size={11} className="text-white" />
                      </div>
                    ) : (
                      <Circle size={18} className="text-ink-15 shrink-0" />
                    )}
                    <span className="text-[13px] flex-1 truncate">
                      {h.emoji && <span className="mr-1.5">{h.emoji}</span>}
                      {h.title}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-4 pb-3 pt-1.5">
              <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EventsSummary() {
  const navigate = useNavigate();
  const today = todayKey();
  const events = useLiveQuery(
    () => db.calendarEvents.where("date").equals(today).toArray(),
    [today]
  );

  const isEmpty = !events || events.length === 0;
  const sorted = events
    ? [...events].sort((a, b) =>
        (a.startTime ?? "").localeCompare(b.startTime ?? "")
      )
    : [];

  return (
    <div
      onClick={() => navigate("/calendar")}
      className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-150 border border-blue-200/60 shadow-sm my-1.5"
    >
      <div className="bg-blue-50 px-3.5 py-2.5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
          <CalendarDays size={14} className="text-blue-600" />
        </div>
        <span className="text-[11px] font-bold text-blue-700/80 uppercase tracking-wider flex-1">
          Eventos hoy
        </span>
        {!isEmpty && (
          <span className="text-[10px] font-data font-bold text-blue-600/70">
            {sorted.length}
          </span>
        )}
        <ChevronRight size={14} className="text-ink-20 shrink-0" />
      </div>
      <div className="bg-paper">
        {isEmpty ? (
          <div className="px-4 py-3">
            <p className="text-[12px] text-ink-30">Sin eventos hoy</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-04">
            {sorted.map((e) => (
              <div
                key={e.id}
                className="px-4 py-2.5 flex items-center gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                {e.startTime && (
                  <span className="text-[11px] font-data font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">
                    {e.startTime}
                  </span>
                )}
                <span className="text-[13px] flex-1 truncate text-ink">
                  {e.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MacroMini({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] text-ink-40">{label}</span>
        <span className="text-[11px] font-data font-bold" style={{ color }}>
          {Math.round(value)}g
        </span>
      </div>
      <div className="h-1.5 bg-ink-06 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {goal > 0 && (
        <p className="text-[9px] text-ink-20 mt-0.5 text-right">{goal}g</p>
      )}
    </div>
  );
}

function NutritionSummary() {
  const navigate = useNavigate();
  const today = todayKey();
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
  const goals = useLiveQuery(() => getNutritionGoals(), []);

  if (!foodItems || !goals) return null;

  const n = calculateDayNutrition(foodItems);
  const calPct =
    goals.calories > 0 ? Math.round((n.calories / goals.calories) * 100) : 0;

  return (
    <div
      onClick={() => navigate("/food")}
      className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-150 border border-amber-200/60 shadow-sm my-1.5"
    >
      <div className="bg-amber-50 px-3.5 py-2.5 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Utensils size={14} className="text-amber-600" />
        </div>
        <span className="text-[11px] font-bold text-amber-700/80 uppercase tracking-wider flex-1">
          Nutrición
        </span>
        <span className="text-[10px] font-data font-bold text-amber-600/70">
          {Math.round(n.calories)} / {goals.calories} kcal
        </span>
        <ChevronRight size={14} className="text-ink-20 shrink-0" />
      </div>
      <div className="bg-paper px-4 py-3 space-y-3">
        {/* Calorie bar */}
        <div>
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(calPct, 100)}%`,
                backgroundColor: calPct > 100 ? "#E63B2E" : "#D97706",
              }}
            />
          </div>
          <p className="text-[10px] text-ink-30 mt-1 text-right">{calPct}%</p>
        </div>
        {/* Macros */}
        <div className="flex gap-4">
          <MacroMini
            label="Proteína"
            value={n.protein}
            goal={goals.protein}
            color="#2563EB"
          />
          <MacroMini
            label="Carbos"
            value={n.carbs}
            goal={goals.carbs}
            color="#D97706"
          />
          <MacroMini
            label="Grasa"
            value={n.fat}
            goal={goals.fat}
            color="#7C3AED"
          />
        </div>
      </div>
    </div>
  );
}

// ── Grouping: split block refs from inline content ──────────

const BLOCK_REF_TYPES = new Set(["tasks", "habits", "events", "nutrition"]);

export type SegmentGroup =
  | { kind: "bubble"; segments: Segment[] }
  | { kind: "card"; refType: string };

export function groupSmartSegments(segments: Segment[]): SegmentGroup[] {
  const groups: SegmentGroup[] = [];
  let currentBubble: Segment[] = [];

  for (const seg of segments) {
    if (seg.type === "ref" && BLOCK_REF_TYPES.has(seg.refType)) {
      if (currentBubble.length > 0) {
        groups.push({ kind: "bubble", segments: currentBubble });
        currentBubble = [];
      }
      groups.push({ kind: "card", refType: seg.refType });
    } else {
      currentBubble.push(seg);
    }
  }

  if (currentBubble.length > 0) {
    groups.push({ kind: "bubble", segments: currentBubble });
  }

  return groups;
}

/** Check if a bubble group has meaningful visible content */
export function hasBubbleContent(segments: Segment[]): boolean {
  return segments.some(
    (s) => s.type === "ref" || (s.type === "text" && s.content.trim().length > 0)
  );
}

// ── Standalone block card (renders outside bubble) ──────────

export function BlockRefCard({ refType }: { refType: string }) {
  switch (refType) {
    case "tasks":
      return <TasksSummary />;
    case "habits":
      return <HabitsSummary />;
    case "events":
      return <EventsSummary />;
    case "nutrition":
      return <NutritionSummary />;
    default:
      return null;
  }
}

// ── Inline segment renderer (for inside bubbles) ────────────

export function InlineSegment({ segment }: { segment: Segment }) {
  if (segment.type === "text") {
    if (!segment.content) return null;
    return <span className="whitespace-pre-wrap">{segment.content}</span>;
  }

  switch (segment.refType) {
    case "task":
      return <TaskChip id={segment.refId!} />;
    case "habit":
      return <HabitChip id={segment.refId!} />;
    case "event":
      return <EventChip id={segment.refId!} />;
    default:
      return null;
  }
}

// ── Legacy: all-in-one render (used during streaming) ───────

export function SmartContent({ content }: { content: string }) {
  const segments = parseSmartContent(content);

  if (segments.length === 1 && segments[0].type === "text") {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  return (
    <div>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          if (!seg.content) return null;
          return (
            <span key={i} className="whitespace-pre-wrap">
              {seg.content}
            </span>
          );
        }

        switch (seg.refType) {
          case "task":
            return <TaskChip key={i} id={seg.refId!} />;
          case "habit":
            return <HabitChip key={i} id={seg.refId!} />;
          case "event":
            return <EventChip key={i} id={seg.refId!} />;
          case "tasks":
            return <TasksSummary key={i} />;
          case "habits":
            return <HabitsSummary key={i} />;
          case "events":
            return <EventsSummary key={i} />;
          case "nutrition":
            return <NutritionSummary key={i} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
