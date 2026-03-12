import { db } from "@/lib/db";
import { todayKey } from "@/lib/dates";
import { calculateStreak, shouldShowHabit } from "@/lib/db/habits";
import { getNutritionGoals, calculateDayNutrition, getMealLabel } from "@/lib/db/meals";
import { getSetting } from "@/lib/db/settings";
import type { AiContext, AiAction } from "./types";

export type { AiContext, AiAction, ChatMessage, ActionState } from "./types";

export async function buildFullContext(): Promise<AiContext> {
  const now = new Date();
  const today = todayKey(now);

  // Tasks
  const allTasks = await db.tasks.toArray();
  const top3 = allTasks
    .filter((t) => t.status === "today" && t.todayRank !== undefined)
    .sort((a, b) => (a.todayRank ?? 0) - (b.todayRank ?? 0))
    .map((t) => ({ id: t.id, title: t.title, rank: t.todayRank!, priority: t.priority ?? "none" }));

  const inbox = allTasks
    .filter((t) => t.status === "inbox")
    .slice(0, 20)
    .map((t) => ({ id: t.id, title: t.title, priority: t.priority ?? "none", notes: t.notes }));

  const snoozed = allTasks
    .filter((t) => t.status === "snoozed")
    .map((t) => ({ id: t.id, title: t.title, snoozedUntil: t.snoozedUntil ?? 0 }));

  // Habits
  const allHabits = await db.habits.filter((h) => !h.archivedAt).toArray();
  const allEntries = await db.habitEntries.toArray();

  const habits = allHabits
    .filter((h) => shouldShowHabit(h, today))
    .map((h) => {
      const hEntries = allEntries.filter((e) => e.habitId === h.id);
      return {
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        streak: calculateStreak(hEntries),
        completedToday: hEntries.some((e) => e.date === today),
        frequency: h.frequency ?? "daily",
      };
    });

  // Calendar
  const allEvents = await db.calendarEvents.toArray();
  const todayEvents = allEvents.filter((e) => e.date === today);
  const upcomingEnd = new Date(now);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);
  const upcoming = allEvents.filter((e) => e.date > today && e.date <= todayKey(upcomingEnd));

  // Nutrition
  const meals = await db.meals.where("date").equals(today).toArray();
  const mealIds = meals.map((m) => m.id);
  const foodItems = mealIds.length > 0
    ? await db.foodItems.where("mealId").anyOf(mealIds).toArray()
    : [];
  const dayNutrition = calculateDayNutrition(foodItems);
  const goals = await getNutritionGoals();

  const nutritionMeals = meals.map((m) => ({
    type: getMealLabel(m.mealType),
    items: foodItems.filter((f) => f.mealId === m.id).map((f) => f.name),
  }));

  const userName = await getSetting("user_name");

  return {
    currentDate: today,
    currentTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    userName: userName || undefined,
    tasks: { top3, inbox, snoozed },
    events: { today: todayEvents, upcoming },
    habits,
    nutrition: { ...dayNutrition, goals, meals: nutritionMeals },
  };
}

export function parseActionsFromContent(raw: string): {
  text: string;
  actions: AiAction[];
} {
  const actions: AiAction[] = [];

  // Match <ACTION>...</ACTION> with flexible casing/whitespace
  const ACTION_RE = /<\s*ACTION\s*>([\s\S]*?)<\s*\/\s*ACTION\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = ACTION_RE.exec(raw)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed?.type) actions.push(parsed as AiAction);
    } catch {
      // ignore malformed JSON
    }
  }

  // If no actions found via tags, try to find inline JSON objects with "type" field
  // (model sometimes outputs raw JSON without tags)
  if (actions.length === 0) {
    const JSON_RE = /\{[^{}]*"type"\s*:\s*"(?:create_task|update_task|delete_task|create_event|update_event|delete_event|create_habit|update_habit|delete_habit|complete_habit|log_food)"[^{}]*\}/g;
    let jsonMatch: RegExpExecArray | null;
    while ((jsonMatch = JSON_RE.exec(raw)) !== null) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed?.type && parsed?.description) actions.push(parsed as AiAction);
      } catch {
        // ignore
      }
    }
  }

  // Clean text: remove all action-like patterns
  const text = raw
    .replace(/<\s*\/?ACTION\s*>[\s\S]*?<\s*\/\s*ACTION\s*>/gi, "")  // full tags
    .replace(/<\s*ACTION\s*>[^<]*/gi, "")                             // unclosed tags
    .replace(/<\s*\/\s*ACTION\s*>/gi, "")                             // orphan closing tags
    .replace(/```(?:json)?\s*\{[^}]*"type"\s*:\s*"(?:create_task|update_task|delete_task|create_event|update_event|delete_event|create_habit|update_habit|delete_habit|complete_habit|log_food)"[^}]*\}\s*```/g, "") // code fenced actions
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, actions };
}
