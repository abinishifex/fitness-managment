'use client';

import type { PlanSummary } from '@/lib/types';
import { formatPlanTrainingSummary } from './PlanTrainingFields';

const SPLIT_LABELS: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / lower',
  push_pull_legs: 'Push / pull / legs',
  bro_split: 'Bro split',
};

type Props = {
  plans: PlanSummary[];
  selectedPlanId: string | null;
  onSelect: (planId: string) => void;
  selectingId?: string | null;
};

export function PlanGrid({ plans, selectedPlanId, onSelect, selectingId }: Props) {
  const enabled = plans.filter((p) => p.enabled);

  if (!enabled.length) {
    return (
      <section className="animate-fade-up" aria-labelledby="plan-library-heading">
        <div className="mb-4">
          <div className="eyebrow">Plan library</div>
          <h2
            id="plan-library-heading"
            className="font-headline-md text-steel-bright uppercase text-2xl mt-1"
          >
            Your plans
          </h2>
          <p className="muted small mt-1">
            No enabled plans yet. Add or activate one in Settings.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up" aria-labelledby="plan-library-heading">
      <div className="mb-4">
        <div className="eyebrow">Plan library</div>
        <h2
          id="plan-library-heading"
          className="font-headline-md text-steel-bright uppercase text-2xl mt-1"
        >
          Switch protocol
        </h2>
        <p className="muted small mt-1">
          Tap a plan to drive Today, General overview, and Workout.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {enabled.map((plan) => {
          const isSelected = String(plan.planId) === String(selectedPlanId);
          const busy = selectingId != null && String(selectingId) === String(plan.planId);
          return (
            <button
              key={plan.planId}
              type="button"
              onClick={() => {
                if (!isSelected) onSelect(plan.planId);
              }}
              disabled={busy}
              className={`text-left relative overflow-hidden p-4 transition-shadow ${
                isSelected
                  ? 'border-2 border-signal-volt shadow-[0_0_24px_rgba(212,255,0,0.12)] bg-surface-overlay/60'
                  : 'border border-surface-highlight bg-surface-overlay/30 hover:border-signal-volt/40'
              }`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-signal-volt text-surface-base px-2 py-0.5 text-[10px] font-label-telemetry uppercase tracking-wider font-bold">
                  Active
                </span>
              )}
              <span className="text-label-telemetry text-signal-volt text-[11px] uppercase tracking-wider">
                {SPLIT_LABELS[plan.splitType] || plan.splitType}
              </span>
              <h3 className="font-headline-md text-steel-bright uppercase text-lg leading-tight mt-1 pr-16">
                {plan.name || 'Untitled plan'}
              </h3>
              <p className="muted small mt-2">
                {formatPlanTrainingSummary(plan)}
              </p>
              {busy && <p className="text-label-telemetry text-signal-volt text-[10px] mt-2 uppercase">Switching…</p>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
