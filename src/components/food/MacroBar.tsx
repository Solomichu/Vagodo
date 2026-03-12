type Props = {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
};

export function MacroBar({ label, current, goal, color, unit = "g" }: Props) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium">{label}</span>
        <span className="font-data text-xs">
          <span className="font-bold" style={{ color }}>{Math.round(current)}</span>
          <span className="text-ink-30"> / {goal}{unit}</span>
        </span>
      </div>
      <div className="h-2 bg-ink-08 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
