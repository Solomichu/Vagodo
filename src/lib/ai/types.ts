import type { TaskStatus, TaskPriority, CalendarEvent, MealType } from "@/types";

// ─── Acciones IA ────────────────────────────────────────────

export type AiAction =
  | {
      type: "create_task";
      title: string;
      status?: TaskStatus;
      notes?: string;
      priority?: TaskPriority;
      description: string;
    }
  | {
      type: "update_task";
      id: string;
      changes: Partial<{
        status: TaskStatus;
        title: string;
        todayRank: number;
        priority: TaskPriority;
        notes: string;
      }>;
      description: string;
    }
  | {
      type: "delete_task";
      id: string;
      description: string;
    }
  | {
      type: "create_event";
      date: string;
      startTime: string;
      endTime: string;
      title: string;
      eventDescription?: string;
      color?: string;
      description: string;
    }
  | {
      type: "update_event";
      id: string;
      changes: Partial<Omit<CalendarEvent, "id">>;
      description: string;
    }
  | {
      type: "delete_event";
      id: string;
      description: string;
    }
  | {
      type: "create_habit";
      title: string;
      emoji?: string;
      frequency?: "daily" | "weekly" | "custom";
      customDays?: number[];
      description: string;
    }
  | {
      type: "update_habit";
      id: string;
      changes: Partial<{
        title: string;
        emoji: string;
        frequency: "daily" | "weekly" | "custom";
        customDays: number[];
      }>;
      description: string;
    }
  | {
      type: "delete_habit";
      id: string;
      description: string;
    }
  | {
      type: "complete_habit";
      habitId: string;
      date?: string;
      description: string;
    }
  | {
      type: "log_food";
      mealType: MealType;
      items: Array<{
        name: string;
        quantity: number;
        unit: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
      description: string;
    };

// ─── Resultado de acción ejecutada ──────────────────────────

export type ActionResult = {
  route: string;
  entityId: string;
  entityType: "task" | "event" | "habit" | "food";
  date?: string;
};

// ─── Estado de acción ───────────────────────────────────────

export type ActionState = "pending" | "confirmed" | "rejected";

// ─── Mensaje de chat ────────────────────────────────────────

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AiAction[];
  actionStates?: Record<number, ActionState>;
  actionResults?: Record<number, ActionResult>;
  isStreaming?: boolean;
};

// ─── Contexto ───────────────────────────────────────────────

export type HabitContext = {
  id: string;
  title: string;
  emoji?: string;
  streak: number;
  completedToday: boolean;
  frequency: string;
};

export type NutritionContext = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goals: { calories: number; protein: number; carbs: number; fat: number };
  meals: Array<{ type: string; items: string[] }>;
};

export type AiContext = {
  currentDate: string;
  currentTime: string;
  userName?: string;
  tasks: {
    top3: Array<{ id: string; title: string; rank: number; priority: string }>;
    inbox: Array<{ id: string; title: string; priority: string; notes?: string }>;
    snoozed: Array<{ id: string; title: string; snoozedUntil: number }>;
  };
  events: {
    today: CalendarEvent[];
    upcoming: CalendarEvent[];
  };
  habits: HabitContext[];
  nutrition: NutritionContext;
};

export type AiRequestBody = {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  context: AiContext;
};
