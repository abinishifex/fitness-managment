'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import type { PlanTrainingInput, Profile } from '@/lib/types';
import EquipmentImage from '@/components/EquipmentImage';
import {
  DEFAULT_PLAN_TRAINING,
  PlanTrainingFields,
} from '@/components/workout/PlanTrainingFields';
import { offlineApi } from '@/lib/offline';

const initialProfile: Profile = {
  name: '',
  age: 25,
  sex: 'male',
  weightKg: 70,
  heightCm: 175,
  equipmentAvailable: [], // bodyweight is always injected at submit; never shown as a card
  limitations: [],
};

/**
 * Equipment cards shown in the UI — 9 items (3×3 grid).
 * "bodyweight" is intentionally omitted: it is always injected into the submit
 * payload automatically so the rules engine always has at least one equipment
 * class to work with.  "none" means "I have no gear" and maps to bodyweight-only
 * exercises server-side.
 *
 * Values must match EQUIPMENT_VALUES in server/src/database/models/MemberProfile.js.
 */
const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'none',             label: 'No equipment' },
  { value: 'dumbbell',         label: 'Dumbbell' },
  { value: 'barbell',          label: 'Barbell' },
  { value: 'machine',          label: 'Machine' },
  { value: 'cable_machine',    label: 'Cable machine' },
  { value: 'resistance_bands', label: 'Resistance bands' },
  { value: 'kettlebell',       label: 'Kettlebell' },
  { value: 'bench',            label: 'Bench' },
  { value: 'pull_up_bar',      label: 'Pull-up bar' },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Profile>(initialProfile);
  const [training, setTraining] = useState<PlanTrainingInput>(DEFAULT_PLAN_TRAINING);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function submit() {
    const t = getToken();
    if (!t) return router.push('/login');
    setBusy(true);
    setError('');
    try {
      const payload: Profile = { ...data };
      // Always include "bodyweight" so the rules engine always has at least one
      // equipment class to match against (bodyweight exercises are the safety baseline).
      payload.equipmentAvailable = [
        ...new Set([...payload.equipmentAvailable, 'bodyweight']),
      ];
      await offlineApi.saveProfile(t, payload);
      await offlineApi.generatePlan(t, {
        select: true,
        fitnessGoal: training.fitnessGoal,
        trainingExperience: training.trainingExperience,
        trainingDaysPerWeek: training.trainingDaysPerWeek,
        sessionDurationMinutes: training.sessionDurationMinutes,
        priorityMuscleGroup: training.priorityMuscleGroup || undefined,
      });
      router.push('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not initialize your plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-shell">
      <div className="form-card" style={{ width: 'min(680px,100%)' }}>
        <div className="eyebrow">Protocol setup // step {step} of 3</div>
        <div className="steps">
          {[1, 2, 3].map((i) => (
            <i className={i <= step ? 'on' : ''} key={i} />
          ))}
        </div>
        <h1 className="display">
          {step === 1 ? 'Your baseline' : step === 2 ? 'Your first plan' : 'Your constraints'}
        </h1>

        {error && <div className="notice error">{error}</div>}

        {/* ── Step 1: Baseline ── */}
        {step === 1 && (
          <>
            <div className="field">
              <label>Name</label>
              <input
                type="text"
                maxLength={80}
                placeholder="Your name"
                value={data.name || ''}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>
            <div className="grid3">
              <div className="field">
                <label>Age</label>
                <input
                  type="number" min="13" max="120"
                  value={data.age}
                  onChange={(e) => update('age', Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Sex</label>
                <select
                  value={data.sex}
                  onChange={(e) => update('sex', e.target.value as Profile['sex'])}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="field">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  value={data.weightKg}
                  onChange={(e) => update('weightKg', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="field">
              <label>Height (cm)</label>
              <input
                type="number"
                value={data.heightCm}
                onChange={(e) => update('heightCm', Number(e.target.value))}
              />
            </div>
          </>
        )}

        {/* ── Step 2: First plan training prefs ── */}
        {step === 2 && (
          <>
            <p className="muted small mb-4">
              These settings apply to your first plan. You can create more plans later with different goals.
            </p>
            <PlanTrainingFields value={training} onChange={setTraining} />
          </>
        )}

        {/* ── Step 3: Constraints ── */}
        {step === 3 && (
          <>
            <div className="field">
              <label>Available equipment</label>
              <div className="grid3">
                {EQUIPMENT_OPTIONS.map(({ value, label }) => {
                  const selected = data.equipmentAvailable.includes(value);
                  return (
                    <label
                      key={value}
                      className={[
                        'card small',
                        'flex flex-col items-center gap-2 cursor-pointer select-none',
                        'relative transition-colors',
                        // focus ring appears when the hidden checkbox is focused
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#D4FF00] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[#111417]',
                        selected
                          ? 'border-[#D4FF00] text-[#D4FF00]'
                          : 'border-[#444932] text-[#8E98A0]',
                      ].join(' ')}
                    >
                      {/* visually hidden but real checkbox — keyboard/SR accessible */}
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={(e) => {
                          if (value === 'none') {
                            // Clicking "none" makes selection exactly ["none"]
                            update('equipmentAvailable', e.target.checked ? ['none'] : []);
                          } else if (e.target.checked) {
                            // Adding any real equipment: remove "none" if present
                            update(
                              'equipmentAvailable',
                              [
                                ...data.equipmentAvailable.filter((x) => x !== 'none'),
                                value,
                              ],
                            );
                          } else {
                            update(
                              'equipmentAvailable',
                              data.equipmentAvailable.filter((x) => x !== value),
                            );
                          }
                        }}
                      />
                      <EquipmentImage value={value} alt="" selected={selected} />
                      <span className="text-xs text-center leading-tight">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="field">
              <label>Limitations (comma separated)</label>
              <textarea
                rows={4}
                value={data.limitations.join(', ')}
                onChange={(e) =>
                  update(
                    'limitations',
                    e.target.value
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>
            <div className="notice">
             We check your equipment, workout level, and time to create a safe plan.
            </div>
          </>
        )}

        {/* ── Navigation ── */}
        <div className="actions">
          <button
            className="btn secondary"
            disabled={step === 1 || busy}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </button>
          {step < 3 ? (
            <button className="btn" onClick={() => setStep((s) => s + 1)}>
              Next
            </button>
          ) : (
            <button className="btn" disabled={busy} onClick={submit}>
              {busy ? 'Generating validated plan…' : 'Save and generate plan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
