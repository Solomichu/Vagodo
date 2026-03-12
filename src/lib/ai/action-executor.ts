import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import { todayKey } from "@/lib/dates";
import { addTask, moveToTop3, deleteTask } from "@/lib/db/tasks";
import { addHabit, updateHabit, deleteHabit, completeHabit } from "@/lib/db/habits";
import { addFoodItem } from "@/lib/db/meals";
import type { AiAction, ActionResult } from "./types";
import type { WeekDay } from "@/types";

/** Map day name variations to our WeekDay (0=Mon..6=Sun) */
const DAY_NAME_MAP: Record<string, WeekDay> = {
  lunes: 0, monday: 0, mon: 0, lu: 0, l: 0,
  martes: 1, tuesday: 1, tue: 1, ma: 1,
  miercoles: 2, miércoles: 2, wednesday: 2, wed: 2, mi: 2, x: 2,
  jueves: 3, thursday: 3, thu: 3, ju: 3, j: 3,
  viernes: 4, friday: 4, fri: 4, vi: 4, v: 4,
  sabado: 5, sábado: 5, saturday: 5, sat: 5, sa: 5, s: 5,
  domingo: 6, sunday: 6, sun: 6, do: 6, d: 6,
};

/** Normalize customDays from AI - handles numbers, strings, day names */
function normalizeCustomDays(raw: unknown): WeekDay[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;

  const days: WeekDay[] = [];
  for (const item of raw) {
    if (typeof item === "number" && item >= 0 && item <= 6) {
      days.push(item as WeekDay);
    } else if (typeof item === "string") {
      const key = item.toLowerCase().trim();
      // Try name mapping first
      if (key in DAY_NAME_MAP) {
        days.push(DAY_NAME_MAP[key]);
      } else {
        // Try parsing as number
        const n = parseInt(key, 10);
        if (!isNaN(n) && n >= 0 && n <= 6) {
          days.push(n as WeekDay);
        }
      }
    }
  }

  return days.length > 0 ? [...new Set(days)].sort() : undefined;
}

export async function executeAction(action: AiAction): Promise<ActionResult | null> {
  // Normalize type to handle whitespace/casing variations from LLM
  const type = (action.type as string).trim().toLowerCase();

  switch (type) {
    case "create_task": {
      const a = action as Extract<AiAction, { type: "create_task" }>;
      const id = await addTask({
        title: a.title,
        notes: a.notes,
        priority: a.priority,
      });
      if (a.status === "today") {
        await moveToTop3(id);
      }
      return { route: "/checklist", entityId: id, entityType: "task" };
    }

    case "update_task": {
      const a = action as Extract<AiAction, { type: "update_task" }>;
      const changes = { ...a.changes };
      if (changes.status === "today" && changes.todayRank === undefined) {
        const { status: _s, ...rest } = changes;
        if (Object.keys(rest).length > 0) {
          await db.tasks.update(a.id, rest);
        }
        await moveToTop3(a.id);
      } else {
        await db.tasks.update(a.id, changes);
      }
      return { route: "/checklist", entityId: a.id, entityType: "task" };
    }

    case "delete_task": {
      const a = action as Extract<AiAction, { type: "delete_task" }>;
      await deleteTask(a.id);
      return null;
    }

    case "create_event": {
      const a = action as Extract<AiAction, { type: "create_event" }>;
      const id = newId();
      await db.calendarEvents.add({
        id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        title: a.title,
        description: a.eventDescription,
        color: a.color,
      });
      return { route: "/calendar", entityId: id, entityType: "event", date: a.date };
    }

    case "update_event": {
      const a = action as Extract<AiAction, { type: "update_event" }>;
      await db.calendarEvents.update(a.id, a.changes);
      const evt = await db.calendarEvents.get(a.id);
      return { route: "/calendar", entityId: a.id, entityType: "event", date: evt?.date };
    }

    case "delete_event": {
      const a = action as Extract<AiAction, { type: "delete_event" }>;
      await db.calendarEvents.delete(a.id);
      return null;
    }

    case "create_habit": {
      const a = action as Extract<AiAction, { type: "create_habit" }>;
      if (!a.title) throw new Error("El hábito necesita un título.");
      const id = await addHabit({
        title: a.title,
        emoji: a.emoji,
        frequency: a.frequency,
        customDays: normalizeCustomDays(a.customDays),
      });
      return { route: "/habits", entityId: id, entityType: "habit" };
    }

    case "update_habit": {
      const a = action as Extract<AiAction, { type: "update_habit" }>;
      const changes = { ...a.changes };
      if (changes.customDays) {
        changes.customDays = normalizeCustomDays(changes.customDays) as WeekDay[];
      }
      await updateHabit(a.id, changes as Parameters<typeof updateHabit>[1]);
      return { route: "/habits", entityId: a.id, entityType: "habit" };
    }

    case "delete_habit": {
      const a = action as Extract<AiAction, { type: "delete_habit" }>;
      await deleteHabit(a.id);
      return null;
    }

    case "complete_habit": {
      const a = action as Extract<AiAction, { type: "complete_habit" }>;
      await completeHabit(a.habitId, a.date ?? todayKey());
      return { route: "/habits", entityId: a.habitId, entityType: "habit" };
    }

    case "log_food": {
      const a = action as Extract<AiAction, { type: "log_food" }>;
      for (const item of a.items) {
        await addFoodItem(a.mealType, {
          ...item,
          estimatedByAi: true,
        });
      }
      return { route: "/food", entityId: a.mealType, entityType: "food" };
    }

    default:
      throw new Error(`Acción no reconocida: "${action.type}"`);
  }
}
