'use client';

type Props = {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  pulse?: boolean;
};

export function ProgressRing({
  value,
  size = 120,
  stroke = 8,
  label,
  sublabel,
  pulse,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${pulse ? 'animate-soft-pulse' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-highlight"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-signal-volt transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-headline-md text-steel-bright text-xl leading-none">
          {label ?? `${Math.round(value)}%`}
        </span>
        {sublabel && (
          <span className="text-[10px] font-label-telemetry uppercase tracking-wider text-steel-muted mt-1">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
