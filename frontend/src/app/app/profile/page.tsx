'use client';
import { useEffect, useState } from 'react';
import { api, getToken } from '@/lib/api';
import type { Profile } from '@/lib/types';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { MUSCLE_OPTIONS, parseMuscleGroupString } from '@/lib/muscleOptions';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = getToken();
    if (t) {
      api
        .getProfile(t)
        .then((x) => {
          setProfile(x.profile);
          // Parse stored string into validated array
          setSelectedMuscles(parseMuscleGroupString(x.profile.priorityMuscleGroup));
        })
        .catch((e: Error) => setError(e.message));
    }
  }, []);

  function handleMuscleChange(values: string[]) {
    setSelectedMuscles(values);
    if (profile) {
      setProfile({ ...profile, priorityMuscleGroup: values.join(',') });
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !profile) return;
    try {
      // Omit priorityMuscleGroup from payload when nothing is selected
      const payload: Profile = { ...profile };
      if (selectedMuscles.length === 0) {
        delete payload.priorityMuscleGroup;
      } else {
        payload.priorityMuscleGroup = selectedMuscles.join(',');
      }
      await api.saveProfile(t, payload);
      setMessage('Profile synced.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Profile // protocol settings</div>
          <h1 className="page-title">Member data.</h1>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice">{message}</div>}

      {profile ? (
        <form className="card" onSubmit={save}>
          <div className="grid3">
            <div className="field">
              <label>Age</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Weight kg</label>
              <input
                type="number"
                value={profile.weightKg}
                onChange={(e) => setProfile({ ...profile, weightKg: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label>Height cm</label>
              <input
                type="number"
                value={profile.heightCm}
                onChange={(e) => setProfile({ ...profile, heightCm: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid3">
            <div className="field">
              <label>Goal</label>
              <select
                value={profile.fitnessGoal}
                onChange={(e) =>
                  setProfile({ ...profile, fitnessGoal: e.target.value as Profile['fitnessGoal'] })
                }
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
                value={profile.trainingExperience}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    trainingExperience: e.target.value as Profile['trainingExperience'],
                  })
                }
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="field">
              <label>Days / week</label>
              <input
                type="number" min="1" max="7"
                value={profile.trainingDaysPerWeek}
                onChange={(e) =>
                  setProfile({ ...profile, trainingDaysPerWeek: Number(e.target.value) })
                }
              />
            </div>
          </div>

          {/* Priority muscles — multi-select, same component as onboarding */}
          <MultiSelectDropdown
            label="Priority muscles"
            options={MUSCLE_OPTIONS as unknown as { value: string; label: string }[]}
            selected={selectedMuscles}
            onChange={handleMuscleChange}
            maxSelected={3}
            placeholder="Choose up to 3 muscles…"
          />

          {/* Display the stored value as readable labels if set */}
          {selectedMuscles.length > 0 && (
            <div style={{ marginBottom: 8, color: 'var(--muted)', fontSize: 13 }}>
              Current:{' '}
              <strong style={{ color: 'var(--text)' }}>
                {selectedMuscles
                  .map((v) => MUSCLE_OPTIONS.find((o) => o.value === v)?.label)
                  .filter(Boolean)
                  .join(', ')}
              </strong>
            </div>
          )}

          <div className="field">
            <label>Limitations</label>
            <textarea
              rows={4}
              value={profile.limitations.join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  limitations: e.target.value
                    .split(',')
                    .map((x) => x.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <button className="btn">Save profile</button>
        </form>
      ) : (
        <div className="card">
          <p className="muted">No profile found.</p>
        </div>
      )}
    </>
  );
}
