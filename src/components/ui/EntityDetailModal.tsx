import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, Clock, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { Modal } from "./Modal";
import { db } from "@/lib/db";
import { formatDateShort } from "@/lib/dates";

type Props = {
  entityId: string;
  entityType: "event" | "task" | "habit" | "food";
  onClose: () => void;
};

function EventDetail({ id }: { id: string }) {
  const event = useLiveQuery(() => db.calendarEvents.get(id), [id]);
  if (!event) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-12 rounded-full shrink-0"
          style={{ backgroundColor: event.color || "var(--color-signal)" }}
        />
        <div>
          <p className="text-lg font-bold">{event.title}</p>
          <p className="text-sm text-ink-50">{formatDateShort(event.date)}</p>
        </div>
      </div>

      {(event.startTime || event.endTime) && (
        <div className="flex items-center gap-2 text-sm text-ink-50">
          <Clock size={14} />
          <span className="font-data">
            {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
          </span>
        </div>
      )}

      {event.description && (
        <p className="text-sm text-ink-50">{event.description}</p>
      )}
    </div>
  );
}

function TaskDetail({ id }: { id: string }) {
  const task = useLiveQuery(() => db.tasks.get(id), [id]);
  if (!task) return null;

  const isTop3 = task.todayRank !== undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-signal/15 text-signal flex items-center justify-center shrink-0">
          <CheckCircle2 size={16} />
        </div>
        <div>
          <p className="text-lg font-bold">{task.title}</p>
          {isTop3 && (
            <p className="text-xs font-data text-signal">Top {task.todayRank}</p>
          )}
        </div>
      </div>

      {task.notes && (
        <p className="text-sm text-ink-50">{task.notes}</p>
      )}

      {task.priority && task.priority !== "none" && (
        <div className="flex items-center gap-2 text-xs text-ink-50">
          <span className={`w-2 h-2 rounded-full ${
            task.priority === "high" ? "bg-signal" :
            task.priority === "medium" ? "bg-amber-500" : "bg-blue-400"
          }`} />
          Prioridad {task.priority === "high" ? "alta" : task.priority === "medium" ? "media" : "baja"}
        </div>
      )}
    </div>
  );
}

function HabitDetail({ id }: { id: string }) {
  const habit = useLiveQuery(() => db.habits.get(id), [id]);
  if (!habit) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl">{habit.emoji}</span>
      <div>
        <p className="text-lg font-bold">{habit.title}</p>
        <p className="text-xs text-green-600 font-medium">Completado</p>
      </div>
    </div>
  );
}

function FoodDetail() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-signal/15 text-signal flex items-center justify-center shrink-0">
        <UtensilsCrossed size={16} />
      </div>
      <p className="text-sm font-medium">Alimento registrado correctamente</p>
    </div>
  );
}

const TITLES: Record<Props["entityType"], string> = {
  event: "Evento creado",
  task: "Tarea creada",
  habit: "Hábito completado",
  food: "Alimento registrado",
};

export function EntityDetailModal({ entityId, entityType, onClose }: Props) {
  return (
    <Modal open onClose={onClose} title={TITLES[entityType]}>
      {entityType === "event" && <EventDetail id={entityId} />}
      {entityType === "task" && <TaskDetail id={entityId} />}
      {entityType === "habit" && <HabitDetail id={entityId} />}
      {entityType === "food" && <FoodDetail />}

      <button
        onClick={onClose}
        className="w-full mt-5 py-2.5 text-sm font-semibold rounded-[1.25rem] bg-signal text-white btn-magnetic"
      >
        Entendido
      </button>
    </Modal>
  );
}
