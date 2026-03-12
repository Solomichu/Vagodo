type Props = {
  current: number;
  best: number;
};

export function StreakBadge({ current, best }: Props) {
  if (current === 0 && best === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {current > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-signal font-bold font-data text-sm">{current}</span>
          <span className="text-xs text-ink-50">racha</span>
        </div>
      )}
      {best > 1 && (
        <div className="flex items-center gap-1">
          <span className="text-ink-30 font-data text-xs">{best}</span>
          <span className="text-[10px] text-ink-30">mejor</span>
        </div>
      )}
    </div>
  );
}
