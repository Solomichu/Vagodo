import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import { todayKey } from "@/lib/dates";
import type { Habit, HabitEntry, HabitCategory, WeekDay } from "@/types";

// ─── Habits CRUD ────────────────────────────────────────────

export async function addHabit(
  data: Pick<Habit, "title"> &
    Partial<Pick<Habit, "emoji" | "description" | "color" | "categoryId" | "frequency" | "customDays">>
): Promise<string> {
  const allHabits = await db.habits.toArray();
  const maxOrder = allHabits.reduce((max, h) => Math.max(max, h.order ?? 0), -1);
  const id = newId();
  await db.habits.add({
    id,
    title: data.title,
    emoji: data.emoji ?? "✅",
    description: data.description,
    color: data.color ?? "#10b981",
    categoryId: data.categoryId,
    frequency: data.frequency ?? "daily",
    customDays: data.customDays,
    order: maxOrder + 1,
    createdAt: Date.now(),
  });
  return id;
}

export async function updateHabit(
  id: string,
  data: Partial<Pick<Habit, "title" | "emoji" | "description" | "color" | "categoryId" | "frequency" | "customDays">>
): Promise<void> {
  await db.habits.update(id, data);
}

export async function deleteHabit(id: string): Promise<void> {
  await db.habits.update(id, { archivedAt: Date.now() });
}

export async function completeHabit(habitId: string, date?: string): Promise<void> {
  const d = date ?? todayKey();
  await db.habitEntries.put({ habitId, date: d, completedAt: Date.now() });
}

export async function uncompleteHabit(habitId: string, date?: string): Promise<void> {
  const d = date ?? todayKey();
  await db.habitEntries.delete([habitId, d]);
}

export async function reorderHabits(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) => db.habits.update(id, { order: index }))
  );
}

// ─── Categories CRUD ────────────────────────────────────────

export async function addCategory(
  data: Pick<HabitCategory, "name" | "color">
): Promise<string> {
  const id = newId();
  await db.habitCategories.add({
    id,
    name: data.name,
    color: data.color,
    createdAt: Date.now(),
  });
  return id;
}

export async function updateCategory(
  id: string,
  data: Partial<Pick<HabitCategory, "name" | "color">>
): Promise<void> {
  await db.habitCategories.update(id, data);
}

export async function deleteCategory(id: string): Promise<void> {
  await db.habitCategories.delete(id);
  const affected = await db.habits.where("categoryId").equals(id).toArray();
  await Promise.all(affected.map((h) => db.habits.update(h.id, { categoryId: undefined })));
}

// ─── Week Range ─────────────────────────────────────────────

export function getISOWeekRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((dow + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: todayKey(monday), end: todayKey(sunday) };
}

// ─── Visibility ─────────────────────────────────────────────

export function getDayOfWeek(dateStr: string): WeekDay {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return (dow === 0 ? 6 : dow - 1) as WeekDay;
}

export function shouldShowHabit(habit: Habit, dateStr: string): boolean {
  // Don't show before the habit was created
  const createdDate = todayKey(new Date(habit.createdAt));
  if (dateStr < createdDate) return false;

  const freq = habit.frequency ?? "daily";
  if (freq === "daily" || freq === "weekly") return true;
  const dow = getDayOfWeek(dateStr);
  return (habit.customDays ?? []).includes(dow);
}

// ─── Streak ─────────────────────────────────────────────────

export function calculateStreak(logs: HabitEntry[]): number {
  if (logs.length === 0) return 0;

  const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse();
  const today = todayKey();
  const yesterdayD = new Date();
  yesterdayD.setDate(yesterdayD.getDate() - 1);
  const yesterday = todayKey(yesterdayD);

  const startDate =
    uniqueDates[0] === today || uniqueDates[0] === yesterday
      ? uniqueDates[0]
      : null;
  if (!startDate) return 0;

  let streak = 0;
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const current = new Date(sy, sm - 1, sd);

  for (let i = 0; i < uniqueDates.length; i++) {
    if (uniqueDates[i] === todayKey(current)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function bestStreak(logs: HabitEntry[]): number {
  if (logs.length === 0) return 0;
  const sorted = [...new Set(logs.map((l) => l.date))].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
      86400000;
    if (Math.round(diff) === 1) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return best;
}
