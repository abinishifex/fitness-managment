'use client';

import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { MUSCLE_OPTIONS } from '@/lib/muscleOptions';
import type { FitnessGoal, PlanTrainingInput, TrainingExperience } from '@/lib/types';

export const DEFAULT_PLAN_TRAINING: PlanTrainingInput = {
  fitnessGoal: 'general_fitness',
  trainingExperience: 'beginner',
  trainingDaysPerWeek: 3,
  sessionDurationMinutes: 45,
  priorityMuscleGroup: '',
};

type Props = {
  value: PlanTrainingInput;
  onChange: (next: PlanTrainingInput) => void;
  /** Compact layout for the add-plan card. */
  compact?: boolean;
};

export function PlanTrainingFields({ value, onChange, compact }: Props) {
  const selectedMuscles = (value.priorityMuscleGroup || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function patch<K extends keyof PlanTrainingInput>(key: K, next: PlanTrainingInput[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={compact ? 'grid sm:grid-cols-2 gap-3' : 'space-y-4'}>
        <div className="field">
          <label htmlFor="plan-goal">Goal</label>
          <select
            id="plan-goal"
            value={value.fitnessGoal}
            onChange={(e) => patch('fitnessGoal', e.target.value as FitnessGoal)}
          >
            <option value="general_fitness">General fitness</option>
            <option value="muscle_gain">Muscle gain</option>
            <option value="fat_loss">Fat loss</option>
            <option value="strength">Strength</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="plan-experience">Experience</label>
          <select
            id="plan-experience"
            value={value.trainingExperience}
            onChange={(e) => patch('trainingExperience', e.target.value as TrainingExperience)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="grid3">
        <div className="field">
          <label htmlFor="plan-days">Days / week</label>
          <input
            id="plan-days"
            type="number"
            min={1}
            max={7}
            value={value.trainingDaysPerWeek}
            onChange={(e) => patch('trainingDaysPerWeek', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="plan-session">Session minutes</label>
          <input
            id="plan-session"
            type="number"
            min={15}
            max={300}
            value={value.sessionDurationMinutes ?? 45}
            onChange={(e) => patch('sessionDurationMinutes', Number(e.target.value))}
          />
        </div>
      </div>

      <MultiSelectDropdown
        label="Priority muscles"
        options={MUSCLE_OPTIONS as unknown as { value: string; label: string }[]}
        selected={selectedMuscles}
        onChange={(values) => patch('priorityMuscleGroup', values.join(','))}
        maxSelected={3}
        placeholder="Choose up to 3 muscles…"
      />
    </div>
  );
}

export const GOAL_LABELS: Record<string, string> = {
  muscle_gain: 'Muscle gain',
  fat_loss: 'Fat loss',
  general_fitness: 'General fitness',
  strength: 'Strength',
};

export function formatPlanTrainingSummary(plan: {
  fitnessGoal?: string | null;
  trainingExperience?: string | null;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  priorityMuscleGroup?: string;
}) {
  const goal = plan.fitnessGoal ? GOAL_LABELS[plan.fitnessGoal] || plan.fitnessGoal : null;
  const xp = plan.trainingExperience
    ? plan.trainingExperience.charAt(0).toUpperCase() + plan.trainingExperience.slice(1)
    : null;
  const parts = [
    goal,
    xp,
    `${plan.trainingDaysPerWeek}d`,
    `${plan.sessionDurationMinutes} min`,
  ].filter(Boolean);
  return parts.join(' · ');
}
