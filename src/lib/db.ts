import Dexie, { type Table } from "dexie";
import type {
  Task,
  TaskList,
  Habit,
  HabitEntry,
  HabitCategory,
  CalendarEvent,
  Meal,
  FoodItem,
  NutritionGoals,
  AppSetting,
} from "@/types";

class MichiDb extends Dexie {
  tasks!: Table<Task, string>;
  taskLists!: Table<TaskList, string>;
  habits!: Table<Habit, string>;
  habitEntries!: Table<HabitEntry, [string, string]>;
  habitCategories!: Table<HabitCategory, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  meals!: Table<Meal, string>;
  foodItems!: Table<FoodItem, string>;
  nutritionGoals!: Table<NutritionGoals, string>;
  appSettings!: Table<AppSetting, string>;

  constructor() {
    super("michi-pwa");

    this.version(1)
      .stores({
        tasks:
          "&id, status, todayRank, listId, listOrder, snoozedUntil, completedAt, dueAt, priority",
        taskLists: "&id, order",
        habits: "&id, archivedAt, order, categoryId",
        habitEntries: "[habitId+date], habitId, date",
        habitCategories: "&id",
        calendarEvents: "&id, date",
        meals: "&id, date, mealType",
        foodItems: "&id, mealId",
        nutritionGoals: "&id",
        appSettings: "&key",
      })
      .upgrade(async (tx) => {
        const listsTable = tx.table("taskLists");
        const count = await listsTable.count();
        if (count === 0) {
          await listsTable.add({
            id: "inbox",
            name: "Inbox",
            color: "#6b7280",
            emoji: "📥",
            order: 0,
            createdAt: Date.now(),
          });
        }
      });

    this.version(2).stores({
      foodItems: "&id, mealId, plateId",
    });
  }
}

export const db = new MichiDb();
