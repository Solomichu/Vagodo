import { db } from "@/lib/db";
import { newId } from "@/lib/ids";
import { todayKey } from "@/lib/dates";
import type { Task, TaskList } from "@/types";

export type SnoozeOption = "1h" | "tonight" | "tomorrow" | "next-week";

// ─── Tasks CRUD ─────────────────────────────────────────────

export async function addTask(
  data: Pick<Task, "title"> &
    Partial<Pick<Task, "notes" | "nextAction" | "listId" | "priority" | "dueAt">>
): Promise<string> {
  const listId = data.listId ?? "inbox";
  const tasksInList = await db.tasks
    .where("listId")
    .equals(listId)
    .and((t) => t.status !== "done")
    .toArray();
  const maxOrder = tasksInList.reduce((max, t) => Math.max(max, t.listOrder ?? 0), -1);

  const id = newId();
  await db.tasks.add({
    id,
    title: data.title,
    notes: data.notes,
    nextAction: data.nextAction,
    listId,
    listOrder: maxOrder + 1,
    priority: data.priority ?? "none",
    dueAt: data.dueAt,
    status: "inbox",
    createdAt: Date.now(),
  });
  return id;
}

export async function updateTask(
  id: string,
  data: Partial<Pick<Task, "title" | "notes" | "nextAction" | "listId" | "priority" | "dueAt">>
): Promise<void> {
  await db.tasks.update(id, data);
}

export async function completeTask(id: string): Promise<void> {
  await db.tasks.update(id, {
    status: "done",
    completedAt: Date.now(),
    todayRank: undefined,
  });
}

export async function uncompleteTask(id: string): Promise<void> {
  await db.tasks.update(id, {
    status: "inbox",
    completedAt: undefined,
  });
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

// ─── Top 3 ──────────────────────────────────────────────────

export async function moveToTop3(id: string): Promise<boolean> {
  const top3 = await db.tasks
    .where("status")
    .equals("today")
    .and((t) => t.todayRank !== undefined)
    .toArray();

  const usedRanks = new Set(top3.map((t) => t.todayRank!));
  const freeSlot = [1, 2, 3].find((r) => !usedRanks.has(r));
  if (!freeSlot) return false;

  await db.tasks.update(id, { todayRank: freeSlot, status: "today" });
  return true;
}

export async function removeFromTop3(id: string): Promise<void> {
  await db.tasks.update(id, { todayRank: undefined, status: "inbox" });
}

// ─── Snooze ─────────────────────────────────────────────────

export async function snoozeTask(id: string, option: SnoozeOption): Promise<void> {
  const now = new Date();
  let snoozedUntil: number;

  switch (option) {
    case "1h":
      snoozedUntil = Date.now() + 3_600_000;
      break;
    case "tonight": {
      const tonight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
      snoozedUntil = tonight.getTime();
      break;
    }
    case "tomorrow": {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
      snoozedUntil = tomorrow.getTime();
      break;
    }
    case "next-week": {
      const dow = now.getDay();
      const daysToMonday = dow === 0 ? 1 : 8 - dow;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToMonday, 9, 0, 0);
      snoozedUntil = monday.getTime();
      break;
    }
  }

  await db.tasks.update(id, {
    status: "snoozed",
    snoozedUntil,
    todayRank: undefined,
  });
}

export async function reactivateTask(id: string): Promise<void> {
  await db.tasks.update(id, { status: "inbox", snoozedUntil: undefined });
}

export async function reactivateExpiredSnoozed(): Promise<void> {
  const now = Date.now();
  await db.tasks
    .where("status")
    .equals("snoozed")
    .and((t) => (t.snoozedUntil ?? 0) <= now)
    .modify({ status: "inbox", snoozedUntil: undefined });
}

// ─── TaskLists CRUD ─────────────────────────────────────────

export async function addTaskList(
  data: Pick<TaskList, "name" | "color"> & Partial<Pick<TaskList, "emoji">>
): Promise<string> {
  const allLists = await db.taskLists.toArray();
  const maxOrder = allLists.reduce((max, l) => Math.max(max, l.order ?? 0), -1);
  const id = newId();
  await db.taskLists.add({
    id,
    name: data.name,
    color: data.color,
    emoji: data.emoji,
    order: maxOrder + 1,
    createdAt: Date.now(),
  });
  return id;
}

// ─── Helpers ────────────────────────────────────────────────

export function formatSnoozedUntil(ms: number): string {
  const d = new Date(ms);
  const today = todayKey();
  const target = todayKey(d);
  const diffDays = Math.round((ms - Date.now()) / 86_400_000);

  if (target === today) return `hoy a las ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (diffDays === 1) return "mañana";
  if (diffDays <= 7) return `en ${diffDays} días`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
