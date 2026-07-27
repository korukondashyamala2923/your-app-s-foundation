export function CalorieRing({
  consumed,
  goal,
  size = 200,
}: {
  consumed: number;
  goal: number;
  size?: number;
}) {
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const over = consumed > goal;
  const remaining = Math.max(goal - consumed, 0);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - c * pct}
          className={over ? "stroke-destructive" : "stroke-primary"}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums text-foreground">{consumed}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          of {goal} kcal
        </span>
        <span
          className={`mt-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            over ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          }`}
        >
          {over ? `${consumed - goal} over` : `${remaining} left`}
        </span>
      </div>
    </div>
  );
}
