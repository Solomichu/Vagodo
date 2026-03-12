type Props = {
  completed: number;
  total: number;
  size?: number;
};

export function ProgressRing({ completed, total, size = 100 }: Props) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--color-ink-08)"
          strokeWidth="6"
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-data">{rate}%</span>
      </div>
    </div>
  );
}
