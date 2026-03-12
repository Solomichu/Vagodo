import { useState, type RefObject } from "react";
import { Plus, Target, X } from "lucide-react";
import { addTask, moveToTop3 } from "@/lib/db/tasks";

export type CaptureTarget = "inbox" | "top3";

type Props = {
  target?: CaptureTarget;
  onClearTarget?: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function QuickCapture({ target = "inbox", onClearTarget, inputRef }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = async () => {
    const title = value.trim();
    if (!title) return;
    const id = await addTask({ title });
    if (target === "top3") {
      await moveToTop3(id);
    }
    setValue("");
    onClearTarget?.();
  };

  return (
    <div className="mb-5">
      {target === "top3" && (
        <div className="flex items-center gap-1.5 mb-1.5 px-1">
          <Target size={12} className="text-signal" />
          <span className="text-[10px] font-medium text-signal">Añadiendo a Top 3</span>
          <button onClick={onClearTarget} className="text-ink-30 hover:text-ink-50 ml-auto">
            <X size={12} />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={target === "top3" ? "Nueva tarea para Top 3..." : "Captura una tarea..."}
          className={`flex-1 bg-paper border rounded-[1rem] px-4 py-3 text-ink placeholder:text-ink-30 focus:outline-none transition-colors ${
            target === "top3" ? "border-signal" : "border-ink-15 focus:border-signal"
          }`}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="w-12 h-12 bg-signal text-white rounded-[1rem] flex items-center justify-center btn-magnetic disabled:opacity-30"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
