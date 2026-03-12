// ── Task (GTD) ──────────────────────────────────────────────

export type TaskStatus = "inbox" | "today" | "snoozed" | "done";
export type TimeBlock = "morning" | "afternoon" | "night" | "none";
export type TaskPriority = "high" | "medium" | "low" | "none";

export type Task = {
  id: string;
  title: string;
  createdAt: number;
  status: TaskStatus;
  completedAt?: number;
  notes?: string;
  todayRank?: number;
  timeBlock?: TimeBlock;
  blockOrder?: number;
  snoozedUntil?: number;
  dueAt?: number;
  listId?: string;
  listOrder?: number;
  priority?: TaskPriority;
  nextAction?: string;
  tags?: string[];
};

export type TaskList = {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  order: number;
  createdAt: number;
  archivedAt?: number;
};

// ── Habits ──────────────────────────────────────────────────

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type HabitFrequency = "daily" | "weekly" | "custom";

export type Habit = {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  color?: string;
  categoryId?: string;
  frequency?: HabitFrequency;
  customDays?: WeekDay[];
  order?: number;
  createdAt: number;
  archivedAt?: number;
};

export type HabitEntry = {
  habitId: string;
  date: string;
  completedAt: number;
};

export type HabitCategory = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

// ── Calendar ────────────────────────────────────────────────

export type CalendarEvent = {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  description?: string;
  color?: string;
};

// ── Food Tracker ────────────────────────────────────────────

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type Meal = {
  id: string;
  date: string;
  mealType: MealType;
  createdAt: number;
};

export type FoodItem = {
  id: string;
  mealId: string;
  plateId?: string;
  plateName?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimatedByAi?: boolean;
};

export type NutritionGoals = {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

// ── Settings ────────────────────────────────────────────────

export type AppSetting = {
  key: string;
  value: string;
};
