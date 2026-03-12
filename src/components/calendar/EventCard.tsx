import { Trash2 } from "lucide-react";
import type { CalendarEvent } from "@/types";
import { db } from "@/lib/db";

type Props = {
  event: CalendarEvent;
};

export function EventCard({ event }: Props) {
  const handleDelete = async () => {
    await db.calendarEvents.delete(event.id);
  };

  return (
    <div
      className="bg-paper border border-ink-08 rounded-[1.25rem] p-3.5 card-enter flex items-center gap-3"
    >
      <div
        className="w-1 h-10 rounded-full shrink-0"
        style={{ backgroundColor: event.color || "var(--color-signal)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{event.title}</p>
        {(event.startTime || event.endTime) && (
          <p className="text-[10px] font-data text-ink-30 mt-0.5">
            {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
          </p>
        )}
        {event.description && (
          <p className="text-xs text-ink-50 mt-0.5 truncate">{event.description}</p>
        )}
      </div>
      <button
        onClick={handleDelete}
        className="p-1.5 rounded-full hover:bg-ink-08 text-ink-30"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
