import { TaskCard } from "./TaskCard";
import type { Task } from "@/types";
import { Target } from "lucide-react";

type Props = {
  tasks: Task[];
};

export function TopThreeSection({ tasks }: Props) {
  const sorted = [...tasks].sort((a, b) => (a.todayRank ?? 0) - (b.todayRank ?? 0));
  const slots = [1, 2, 3];

  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-signal">
        <Target size={14} /> TOP 3
      </h3>
      <div className="space-y-2">
        {slots.map((rank) => {
          const task = sorted.find((t) => t.todayRank === rank);
          if (task) return <TaskCard key={task.id} task={task} />;

          return (
            <div
              key={rank}
              className="border-2 border-dashed border-ink-08 rounded-[1.25rem] p-3.5 text-center text-ink-15 text-xs"
            >
              Slot {rank} libre
            </div>
          );
        })}
      </div>
    </div>
  );
}
