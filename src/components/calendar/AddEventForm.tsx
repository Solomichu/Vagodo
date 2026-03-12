import { useState } from "react";
import { db } from "@/lib/db";
import { newId } from "@/lib/ids";

type Props = {
  date: string;
  open: boolean;
  onClose: () => void;
};

const COLORS = ["#E63B2E", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export function AddEventForm({ date, open, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState("#E63B2E");

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await db.calendarEvents.add({
      id: newId(),
      date,
      title: title.trim(),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      color,
    });
    setTitle("");
    setStartTime("");
    setEndTime("");
    onClose();
  };

  const handleCancel = () => {
    setTitle("");
    setStartTime("");
    setEndTime("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="bg-paper border border-ink-15 rounded-[1.5rem] p-4 space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Título del evento"
        className="w-full bg-transparent border-b border-ink-15 pb-2 text-sm focus:outline-none focus:border-signal"
        autoFocus
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="flex-1 bg-ink-08 rounded-lg px-3 py-2 text-xs font-data"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="flex-1 bg-ink-08 rounded-lg px-3 py-2 text-xs font-data"
        />
      </div>
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-offset-surface ring-ink" : ""}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={handleCancel} className="flex-1 py-2 text-xs rounded-xl bg-ink-08 text-ink-50">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className="flex-1 py-2 text-xs rounded-xl bg-signal text-white disabled:opacity-30"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
