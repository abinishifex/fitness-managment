'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Exercise } from '@/lib/types';
import {
  EXERCISE_TYPES,
  getExerciseImage,
  resolveExerciseType,
  type ExerciseTypeKey,
} from '@/lib/exerciseMedia';
import { ExerciseTypeGrid } from '@/components/workout/ExerciseTypeGrid';
import { offlineApi, peekExercises } from '@/lib/offline';

function ExercisesContent() {
  const params = useSearchParams();
  const typeParam = (params.get('type') || '') as ExerciseTypeKey | '';
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const cached = peekExercises();
    if (cached?.exercises?.length) {
      setExercises(cached.exercises);
      setLoading(false);
    }
    offlineApi
      .listExercises({ limit: '100' })
      .then((result) => setExercises(result.data.exercises))
      .catch((e) => {
        if (!peekExercises()?.exercises?.length) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeType = EXERCISE_TYPES.find((t) => t.key === typeParam);

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesType = activeType
        ? resolveExerciseType(ex.primaryMuscles).key === activeType.key
        : true;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.primaryMuscles.some((m) => m.includes(q)) ||
        ex.type.includes(q);
      return matchesType && matchesQuery;
    });
  }, [exercises, activeType, query]);

  return (
    <div className="space-y-8">
      <div className="page-head">
        <div>
          <div className="eyebrow">Catalogue // movement library</div>
          <h1 className="page-title">Exercise types</h1>
          <p className="muted">
            Browse by pattern with AI-generated visuals, then drill into approved catalogue lifts.
          </p>
        </div>
        <Link href="/app/workout" className="btn">
          Start workout
        </Link>
      </div>

      <ExerciseTypeGrid />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
        <div>
          <div className="eyebrow">Catalogue</div>
          <h2 className="font-headline-md text-steel-bright uppercase text-2xl mt-1">
            {activeType ? activeType.label : 'All movements'}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {activeType && (
            <Link href="/app/exercises" className="btn secondary !py-2 !px-3 text-xs">
              Clear filter
            </Link>
          )}
          <input
            className="bg-surface-raised border border-surface-highlight px-3 py-2 text-sm text-steel-bright outline-none focus:border-signal-volt min-w-[200px]"
            placeholder="Search exercises…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}
      {loading ? (
        <div className="notice">Loading approved catalogue…</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((ex, i) => {
            const img = getExerciseImage(ex.primaryMuscles);
            return (
              <article
                key={ex._id}
                className="group relative overflow-hidden border border-surface-highlight min-h-[220px] animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={ex.name}
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.62] contrast-125 transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/50 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-end p-5">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="tag">{ex.type}</span>
                    <span className="tag">{ex.difficulty}</span>
                  </div>
                  <h3 className="font-headline-md text-steel-bright uppercase text-xl leading-tight">
                    {ex.name}
                  </h3>
                  <p className="text-[11px] text-steel-muted mt-2 uppercase tracking-wider">
                    {ex.primaryMuscles.join(' · ').replaceAll('_', ' ')}
                  </p>
                  <p className="text-sm text-steel-muted mt-2 line-clamp-2">{ex.instructions}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !filtered.length && <div className="notice">No exercises match this filter.</div>}
    </div>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div className="notice">Loading exercise types…</div>}>
      <ExercisesContent />
    </Suspense>
  );
}
