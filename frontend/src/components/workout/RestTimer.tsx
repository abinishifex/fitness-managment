'use client';

import { useEffect, useState } from 'react';
import { ProgressRing } from './ProgressRing';

type Props = {
  seconds: number;
  active: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

export function RestTimer({ seconds, active, onComplete, onSkip }: Props) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
  }, [active, seconds]);

  useEffect(() => {
    if (!active) return;
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => window.clearTimeout(id);
  }, [active, remaining, onComplete]);

  if (!active) return null;

  const pct = seconds ? ((seconds - remaining) / seconds) * 100 : 100;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-surface-base/80 backdrop-blur-md p-4 animate-fade-up">
      <div className="w-full max-w-sm border border-signal-volt/40 bg-surface-overlay p-8 text-center shadow-[0_0_60px_rgba(212,255,0,0.12)]">
        <p className="text-label-telemetry text-signal-volt uppercase tracking-widest text-xs mb-4">
          Rest interval
        </p>
        <div className="flex justify-center mb-4">
          <ProgressRing
            value={pct}
            size={160}
            stroke={10}
            label={`${remaining}`}
            sublabel="seconds"
            pulse={remaining <= 5}
          />
        </div>
        <div className="h-1.5 bg-surface-highlight overflow-hidden mb-6">
          <div
            className="h-full bg-signal-volt transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button type="button" className="btn w-full" onClick={onSkip}>
          Skip rest
        </button>
      </div>
    </div>
  );
}
