'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';
import type { Profile } from '@/lib/types';
import { offlineApi, peekProfile, useSyncStatus } from '@/lib/offline';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { refreshPending } = useSyncStatus();

  useEffect(() => {
    const cached = peekProfile();
    if (cached?.profile) {
      setProfile(cached.profile);
    }

    const t = getToken();
    if (t) {
      offlineApi
        .getProfile(t)
        .then((x) => {
          setProfile(x.data.profile);
        })
        .catch((e: Error) => {
          if (!peekProfile()) setError(e.message);
        });
    }
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t || !profile) return;
    setError('');
    try {
      const payload: Profile = {
        ...profile,
        name: (profile.name || '').trim(),
      };
      const result = await offlineApi.saveProfile(t, payload);
      setProfile(result.data.profile);
      refreshPending();
      setMessage(result.queued ? 'Saved offline — will sync when you are back online.' : 'Profile synced.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Profile // member data</div>
          <h1 className="page-title">Profile.</h1>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice">{message}</div>}

      {profile ? (
        <form className="card space-y-6" onSubmit={save}>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              maxLength={80}
              placeholder="Your name"
              value={profile.name || ''}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </div>

          <div>
            <p className="muted small mb-3">Body metrics</p>
            <div className="grid3">
              <div className="field">
                <label htmlFor="profile-age">Age</label>
                <input
                  id="profile-age"
                  type="number"
                  min={13}
                  max={120}
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-weight">Weight kg</label>
                <input
                  id="profile-weight"
                  type="number"
                  value={profile.weightKg}
                  onChange={(e) => setProfile({ ...profile, weightKg: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-height">Height cm</label>
                <input
                  id="profile-height"
                  type="number"
                  value={profile.heightCm}
                  onChange={(e) => setProfile({ ...profile, heightCm: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="profile-limitations">Limitations</label>
            <textarea
              id="profile-limitations"
              rows={4}
              placeholder="Injuries, restrictions — comma separated"
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
            <p className="muted small mt-2">
              Training goal, experience, days, and priority muscles are set per plan in Plans.
            </p>
          </div>

          <button className="btn" type="submit">
            Save profile
          </button>
        </form>
      ) : (
        <div className="card">
          <p className="muted">No profile found.</p>
        </div>
      )}
    </>
  );
}
