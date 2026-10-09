'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';
import type { Profile } from '@/lib/types';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { MUSCLE_OPTIONS } from '@/lib/muscleOptions';
import EquipmentImage from '@/components/EquipmentImage';
import { offlineApi } from '@/lib/offline';

const initial: Profile = {
  age: 25,
  sex: 'male',
  weightKg: 70,
  heightCm: 175,
  fitnessGoal: 'general_fitness',
  trainingExperience: 'beginner',
  trainingDaysPerWeek: 3,
  sessionDurationMinutes: 45,
  equipmentAvailable: [],   // bodyweight is always injected at submit; never shown as a card
  priorityMuscleGroup: '',
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

/**
 * Strip "bodyweight" from a stored equipmentAvailable array before showing it
 * in the UI (bodyweight is always injected at submit, never shown as a card).
 *
 * Edge cases:
 *  - ["bodyweight"]          → ["none"]  (older profiles: map to "No equipment")
 *  - ["bodyweight","barbell"]→ ["barbell"] (just strip the implicit entry)
 *  - []                      → []
 *  - unknown values are kept (future-proof; FallbackIcon handles display)
 */
function normalizeEquipmentForDisplay(stored: string[]): string[] {
  const without = stored.filter((v) => v !== 'bodyweight');
  // If stripping bodyweight left nothing, the profile was bodyweight-only → "none"
  return without.length === 0 && stored.includes('bodyweight') ? ['none'] : without;
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Profile>(initial);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function handleMuscleChange(values: string[]) {
    setSelectedMuscles(values);
    update('priorityMuscleGroup', values.join(','));
  }

  async function submit() {
    const t = getToken();
    if (!t) return router.push('/login');
    setBusy(true);
    setError('');
    try {
      const payload: Profile = { ...data };
      if (selectedMuscles.length === 0) {
        delete payload.priorityMuscleGroup;
      } else {
        payload.priorityMuscleGroup = selectedMuscles.join(',');
      }
      // Always include "bodyweight" so the rules engine always has at least one
      // equipment class to match against (bodyweight exercises are the safety baseline).
      // Dedup with Set so we never double-send it.
      payload.equipmentAvailable = [
        ...new Set([...payload.equipmentAvailable, 'bodyweight']),
      ];
      await offlineApi.saveProfile(t, payload);
      await offlineApi.generatePlan(t);
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
          {step === 1 ? 'Your baseline' : step === 2 ? 'Your training' : 'Your constraints'}
        </h1>

        {error && <div className="notice error">{error}</div>}

        {/* ── Step 1: Baseline ── */}
        {step === 1 && (
          <>
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

        {/* ── Step 2: Training ── */}
        {step === 2 && (
          <>
            <div className="field">
              <label>Goal</label>
              <select
                value={data.fitnessGoal}
                onChange={(e) => update('fitnessGoal', e.target.value as Profile['fitnessGoal'])}
              >
                <option value="general_fitness">General fitness</option>
                <option value="muscle_gain">Muscle gain</option>
                <option value="fat_loss">Fat loss</option>
                <option value="strength">Strength</option>
              </select>
            </div>
            <div className="field">
              <label>Experience</label>
              <select
                value={data.trainingExperience}
                onChange={(e) =>
                  update('trainingExperience', e.target.value as Profile['trainingExperience'])
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="grid3">
              <div className="field">
                <label>Days / week</label>
                <input
                  type="number" min="1" max="7"
                  value={data.trainingDaysPerWeek}
                  onChange={(e) => update('trainingDaysPerWeek', Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label>Session minutes</label>
                <input
                  type="number" min="15" max="300"
                  value={data.sessionDurationMinutes}
                  onChange={(e) => update('sessionDurationMinutes', Number(e.target.value))}
                />
              </div>
            </div>
            {/* Priority muscle multi-select — spans full width below the grid */}
            <MultiSelectDropdown
              label="Priority muscles"
              options={MUSCLE_OPTIONS as unknown as { value: string; label: string }[]}
              selected={selectedMuscles}
              onChange={handleMuscleChange}
              maxSelected={3}
              placeholder="Choose up to 3 muscles…"
            />
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
