import { TaskCard } from "./TaskCard";
import type { Task } from "@/types";
import { Clock } from "lucide-react";

type Props = {
  tasks: Task[];
};

export function SnoozedSection({ tasks }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-ink-50">
        <Clock size={14} /> Pospuestas ({tasks.length})
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
