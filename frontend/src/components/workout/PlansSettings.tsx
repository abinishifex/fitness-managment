'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';
import type { FitnessGoal, PlanSummary, PlanTrainingInput, TrainingExperience } from '@/lib/types';
import { offlineApi, peekPlans, useSyncStatus } from '@/lib/offline';
import {
  DEFAULT_PLAN_TRAINING,
  PlanTrainingFields,
  formatPlanTrainingSummary,
} from './PlanTrainingFields';
import {
  PlanAiResponseFields,
  daysFromActivePlan,
  daysToPatch,
  type EditDayRow,
} from './PlanAiResponseFields';

const SPLIT_LABELS: Record<string, string> = {
  full_body: 'Full body',
  upper_lower: 'Upper / lower',
  push_pull_legs: 'Push / pull / legs',
  bro_split: 'Bro split',
};

function trainingFromPlan(plan: PlanSummary): PlanTrainingInput {
  return {
    fitnessGoal: (plan.fitnessGoal as FitnessGoal) || DEFAULT_PLAN_TRAINING.fitnessGoal,
    trainingExperience:
      (plan.trainingExperience as TrainingExperience) || DEFAULT_PLAN_TRAINING.trainingExperience,
    trainingDaysPerWeek: plan.trainingDaysPerWeek || DEFAULT_PLAN_TRAINING.trainingDaysPerWeek,
    sessionDurationMinutes:
      plan.sessionDurationMinutes || DEFAULT_PLAN_TRAINING.sessionDurationMinutes,
    priorityMuscleGroup: plan.priorityMuscleGroup || '',
  };
}

export function PlansSettings() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [training, setTraining] = useState<PlanTrainingInput>(DEFAULT_PLAN_TRAINING);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAiReason, setEditAiReason] = useState('');
  const [editTraining, setEditTraining] = useState<PlanTrainingInput>(DEFAULT_PLAN_TRAINING);
  const [editDays, setEditDays] = useState<EditDayRow[] | null>(null);
  const [editDaysLoading, setEditDaysLoading] = useState(false);
  const { refreshPending } = useSyncStatus();

  function applyList(data: { plans: PlanSummary[]; selectedPlanId: string | null }) {
    setPlans(data.plans);
    setSelectedPlanId(data.selectedPlanId);
  }

  useEffect(() => {
    const cached = peekPlans();
    if (cached) applyList(cached);

    const token = getToken();
    if (!token) return;

    let cancelled = false;
    offlineApi
      .listPlans(token)
      .then((r) => {
        if (!cancelled) applyList(r.data);
      })
      .catch((e: Error) => {
        if (!cancelled && !peekPlans()) setError(e.message);
      });

    function onCacheUpdated() {
      const next = peekPlans();
      if (next) applyList(next);
    }
    window.addEventListener('forge:cache-updated', onCacheUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('forge:cache-updated', onCacheUpdated);
    };
  }, []);

  function startEdit(plan: PlanSummary) {
    setEditingId(plan.planId);
    setEditName(plan.name || '');
    setEditNote(plan.note || '');
    setEditAiReason(plan.aiReason || '');
    setEditTraining(trainingFromPlan(plan));
    setEditDays(null);
    setEditDaysLoading(true);

    const token = getToken();
    if (!token) {
      setEditDaysLoading(false);
      return;
    }

    offlineApi
      .getActivePlan(token, plan.planId)
      .then((r) => {
        setEditDays(daysFromActivePlan(r.data.days || []));
        if (r.data.aiReason != null) setEditAiReason(r.data.aiReason || '');
      })
      .catch((e: Error) => {
        setError(e.message || 'Could not load plan days');
        setEditDays([]);
      })
      .finally(() => setEditDaysLoading(false));
  }

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setAdding(true);
    setError('');
    setMessage('');
    try {
      const result = await offlineApi.generatePlan(token, {
        name: newName.trim() || undefined,
        select: plans.length === 0,
        fitnessGoal: training.fitnessGoal,
        trainingExperience: training.trainingExperience,
        trainingDaysPerWeek: training.trainingDaysPerWeek,
        sessionDurationMinutes: training.sessionDurationMinutes,
        priorityMuscleGroup: training.priorityMuscleGroup || undefined,
      });
      refreshPending();
      setNewName('');
      setTraining(DEFAULT_PLAN_TRAINING);
      const list = peekPlans();
      if (list) applyList(list);
      setMessage(
        result.queued
          ? 'Plan generation queued — will run when you are back online.'
          : result.data
            ? `Added “${result.data.name || 'plan'}”.`
            : 'Plan added.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add plan');
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(planId: string) {
    const token = getToken();
    if (!token) return;
    setBusyId(planId);
    setError('');
    try {
      const result = await offlineApi.updatePlan(token, planId, {
        name: editName.trim(),
        note: editNote.trim(),
        aiReason: editAiReason.trim(),
        fitnessGoal: editTraining.fitnessGoal,
        trainingExperience: editTraining.trainingExperience,
        trainingDaysPerWeek: editTraining.trainingDaysPerWeek,
        sessionDurationMinutes: editTraining.sessionDurationMinutes,
        priorityMuscleGroup: editTraining.priorityMuscleGroup || '',
        ...(editDays ? { days: daysToPatch(editDays) } : {}),
      });
      refreshPending();
      if ('plans' in result.data) applyList(result.data as { plans: PlanSummary[]; selectedPlanId: string | null });
      else {
        const list = peekPlans();
        if (list) applyList(list);
      }
      setEditingId(null);
      setEditDays(null);
      setMessage(
        result.queued
          ? 'Saved offline — will sync later.'
          : 'Plan updated (training prefs + AI response fields).',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update plan');
    } finally {
      setBusyId(null);
    }
  }

  async function regenerateEdit(planId: string) {
    const token = getToken();
    if (!token) return;
    setBusyId(planId);
    setError('');
    setMessage('');
    try {
      // Persist name/note first so regenerate uses the edited title.
      await offlineApi.updatePlan(token, planId, {
        name: editName.trim(),
        note: editNote.trim(),
      });
      const result = await offlineApi.regeneratePlan(token, planId, {
        name: editName.trim() || undefined,
        fitnessGoal: editTraining.fitnessGoal,
        trainingExperience: editTraining.trainingExperience,
        trainingDaysPerWeek: editTraining.trainingDaysPerWeek,
        sessionDurationMinutes: editTraining.sessionDurationMinutes,
        priorityMuscleGroup: editTraining.priorityMuscleGroup || undefined,
      });
      refreshPending();
      const list = peekPlans();
      if (list) applyList(list);
      setEditingId(null);
      setMessage(
        result.queued
          ? 'Regenerate queued — will run when you are back online.'
          : 'Plan regenerated with the form settings.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate plan');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEnabled(plan: PlanSummary) {
    const token = getToken();
    if (!token) return;
    setBusyId(plan.planId);
    setError('');
    try {
      const result = await offlineApi.updatePlan(token, plan.planId, { enabled: !plan.enabled });
      refreshPending();
      if ('plans' in result.data) applyList(result.data as { plans: PlanSummary[]; selectedPlanId: string | null });
      else {
        const list = peekPlans();
        if (list) applyList(list);
      }
      setMessage(
        result.queued
          ? 'Saved offline — will sync later.'
          : plan.enabled
            ? 'Plan deactivated.'
            : 'Plan activated.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setBusyId(null);
    }
  }

  async function removePlan(plan: PlanSummary) {
    if (!window.confirm(`Delete “${plan.name || 'Untitled plan'}”? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    setBusyId(plan.planId);
    setError('');
    try {
      const result = await offlineApi.deletePlan(token, plan.planId);
      refreshPending();
      if ('plans' in result.data) applyList(result.data as { plans: PlanSummary[]; selectedPlanId: string | null });
      else {
        const list = peekPlans();
        if (list) applyList(list);
      }
      setMessage(result.queued ? 'Delete queued — will sync later.' : 'Plan deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete plan');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="plans-settings-heading">
      <p id="plans-settings-heading" className="muted small">
        Manage protocols. Each plan has its own goal, experience, days, and priorities.
        Activate to show in Train and Workout; select by tapping a card on Train.
      </p>

      {error && <div className="notice error">{error}</div>}
      {message && <div className="notice">{message}</div>}

      <form className="card space-y-4" onSubmit={addPlan}>
        <div className="field">
          <label htmlFor="new-plan-name">Add plan</label>
          <input
            id="new-plan-name"
            type="text"
            maxLength={80}
            placeholder="Optional name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>

        <PlanTrainingFields value={training} onChange={setTraining} compact />

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" type="submit" disabled={adding}>
            {adding ? 'Generating…' : 'Generate'}
          </button>
          <p className="muted small">Creates another plan without archiving others.</p>
        </div>
      </form>

      {plans.length === 0 ? (
        <div className="card">
          <p className="muted">No plans yet. Generate one above or finish onboarding.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => {
            const busy = busyId === plan.planId;
            const isSelected = String(plan.planId) === String(selectedPlanId);
            const isEditing = editingId === plan.planId;
            return (
              <li
                key={plan.planId}
                className={`border p-4 ${
                  isSelected ? 'border-signal-volt/60 bg-surface-overlay/50' : 'border-surface-highlight'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="field">
                      <label htmlFor={`edit-name-${plan.planId}`}>Name</label>
                      <input
                        id={`edit-name-${plan.planId}`}
                        type="text"
                        maxLength={80}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`edit-note-${plan.planId}`}>Note</label>
                      <textarea
                        id={`edit-note-${plan.planId}`}
                        rows={2}
                        maxLength={280}
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                      />
                    </div>

                    <div>
                      <p className="muted small mb-2">Training (feeds AI / rules regenerate)</p>
                      <PlanTrainingFields value={editTraining} onChange={setEditTraining} compact />
                    </div>

                    <PlanAiResponseFields
                      planId={plan.planId}
                      aiReason={editAiReason}
                      onAiReasonChange={setEditAiReason}
                      days={editDays}
                      onDaysChange={setEditDays}
                      loading={editDaysLoading}
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn"
                        disabled={busy || editDaysLoading}
                        onClick={() => void saveEdit(plan.planId)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => void regenerateEdit(plan.planId)}
                      >
                        {busy ? 'Working…' : 'Regenerate'}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null);
                          setEditDays(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="muted small">
                      Save writes training prefs and AI response fields (reason, sets/reps/RPE/rest).
                      Regenerate rebuilds exercises from the training form (keeps this plan id).
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-headline-md text-steel-bright uppercase text-lg">
                            {plan.name || 'Untitled plan'}
                          </h3>
                          {isSelected && (
                            <span className="bg-signal-volt text-surface-base px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              Selected
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase tracking-wider border ${
                              plan.enabled
                                ? 'border-signal-volt/40 text-signal-volt'
                                : 'border-steel-muted text-steel-muted'
                            }`}
                          >
                            {plan.enabled ? 'Enabled' : 'Deactivated'}
                          </span>
                        </div>
                        <p className="muted small mt-1">
                          {SPLIT_LABELS[plan.splitType] || plan.splitType} ·{' '}
                          {formatPlanTrainingSummary(plan)}
                        </p>
                        {plan.note ? <p className="muted small mt-1">{plan.note}</p> : null}
                        {plan.aiReason ? (
                          <p className="muted small mt-1 line-clamp-2">{plan.aiReason}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => startEdit(plan)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => void toggleEnabled(plan)}
                      >
                        {plan.enabled ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => void removePlan(plan)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
