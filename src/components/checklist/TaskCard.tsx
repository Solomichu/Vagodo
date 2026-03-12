import { useState, useRef, useEffect } from "react";
import {
  Check,
  MoreHorizontal,
  Star,
  Clock,
  Undo2,
  Trash2,
} from "lucide-react";
import {
  completeTask,
  uncompleteTask,
  moveToTop3,
  removeFromTop3,
  snoozeTask,
  deleteTask,
  reactivateTask,
  formatSnoozedUntil,
} from "@/lib/db/tasks";
import type { Task } from "@/types";

type Props = {
  task: Task;
  onEdit?: () => void;
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-signal",
  medium: "bg-amber-500",
  low: "bg-blue-400",
};

export function TaskCard({ task, onEdit }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDone = task.status === "done";
  const isSnoozed = task.status === "snoozed";
  const isTop3 = task.todayRank !== undefined;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleToggle = () => {
    if (isDone) uncompleteTask(task.id);
    else completeTask(task.id);
  };

  return (
    <div
      className={`bg-paper border rounded-[1.25rem] p-3.5 card-enter flex items-start gap-3 ${
        isTop3 ? "border-signal/30" : "border-ink-08"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
          isDone
            ? "bg-signal border-signal text-white"
            : "border-ink-15 hover:border-ink-30"
        }`}
      >
        {isDone && <Check size={12} strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0" onClick={onEdit}>
        <div className="flex items-center gap-2">
          {task.priority && task.priority !== "none" && (
            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
          )}
          <p className={`text-sm font-medium truncate ${isDone ? "line-through text-ink-30" : ""}`}>
            {task.title}
          </p>
        </div>
        {isSnoozed && task.snoozedUntil && (
          <p className="text-[10px] font-data text-ink-30 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> {formatSnoozedUntil(task.snoozedUntil)}
          </p>
        )}
        {isTop3 && (
          <p className="text-[10px] font-data text-signal mt-0.5">
            TOP {task.todayRank}
          </p>
        )}
      </div>

      {/* Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1 rounded-full hover:bg-ink-08 text-ink-30"
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 bg-paper border border-ink-15 rounded-xl shadow-lg z-50 min-w-[140px] overflow-hidden">
            {!isDone && !isTop3 && (
              <button
                onClick={() => { moveToTop3(task.id); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-ink-08"
              >
                <Star size={12} /> Top 3
              </button>
            )}
            {isTop3 && (
              <button
                onClick={() => { removeFromTop3(task.id); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-ink-08"
              >
                <Undo2 size={12} /> Quitar Top 3
              </button>
            )}
            {!isDone && !isSnoozed && (
              <>
                <button
                  onClick={() => { snoozeTask(task.id, "1h"); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-ink-08"
                >
                  <Clock size={12} /> 1 hora
                </button>
                <button
                  onClick={() => { snoozeTask(task.id, "tomorrow"); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-ink-08"
                >
                  <Clock size={12} /> Mañana
                </button>
              </>
            )}
            {isSnoozed && (
              <button
                onClick={() => { reactivateTask(task.id); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-ink-08"
              >
                <Undo2 size={12} /> Reactivar
              </button>
            )}
            <button
              onClick={() => { deleteTask(task.id); setMenuOpen(false); }}
              className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-ink-08 text-signal"
            >
              <Trash2 size={12} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
