'use client';

import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '@/lib/types';
import { getExerciseMedia, resolveExerciseType } from '@/lib/exerciseMedia';

type Props = {
  exercise: Exercise | null;
  onClose: () => void;
};

export function ExerciseDetailModal({ exercise, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const media = exercise ? getExerciseMedia(exercise.primaryMuscles, exercise) : null;
  const showVideo = Boolean(media?.video) && !failed;

  useEffect(() => {
    if (!exercise) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exercise, onClose]);

  useEffect(() => {
    setFailed(false);
    setPlaying(Boolean(media?.video));
    const el = videoRef.current;
    if (!el || !media?.video) return;
    el.load();
    const play = el.play();
    if (play) play.catch(() => setPlaying(false));
  }, [exercise?._id, media?.video]);

  if (!exercise || !media) return null;

  const typeMeta = resolveExerciseType(exercise.primaryMuscles);

  function togglePlayback() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      const play = el.play();
      if (play) play.then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-detail-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden border border-surface-highlight bg-surface-base flex flex-col">
        <div className="relative aspect-video bg-surface-raised overflow-hidden shrink-0">
          {showVideo ? (
            <video
              key={media.video}
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              src={media.video}
              poster={media.poster || media.image}
              muted
              loop
              playsInline
              autoPlay
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setFailed(true)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.poster || media.image}
              alt={exercise.name}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.85]"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-surface-base/80 via-transparent to-surface-base/20 pointer-events-none" />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {showVideo ? (
                <span className="inline-flex items-center gap-2 bg-surface-overlay/90 border border-signal-volt/40 px-3 py-1 text-label-telemetry text-signal-volt uppercase tracking-widest text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-signal-volt animate-ping" />
                  {playing ? 'Demo loop' : 'Paused'}
                </span>
              ) : media.hasDemo ? (
                <span className="tag">Form still</span>
              ) : (
                <span className="tag">{typeMeta.label}</span>
              )}
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center w-9 h-9 border border-surface-highlight bg-surface-overlay/90 text-steel-bright hover:border-signal-volt hover:text-signal-volt transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {showVideo && (
            <button
              type="button"
              onClick={togglePlayback}
              className="absolute bottom-3 right-3 inline-flex items-center gap-2 border border-signal-volt/40 bg-surface-overlay/90 px-3 py-2 text-signal-volt text-[11px] uppercase tracking-wider hover:border-signal-volt transition-colors"
              aria-label={playing ? 'Pause demo' : 'Play demo'}
            >
              <span className="material-symbols-outlined text-lg">
                {playing ? 'pause' : 'play_arrow'}
              </span>
              {playing ? 'Pause' : 'Play'}
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-label-telemetry text-signal-volt uppercase tracking-wider text-[10px] mb-1">
              {typeMeta.label} · {exercise.type} · {exercise.difficulty}
            </p>
            <h2
              id="exercise-detail-title"
              className="font-headline-md text-steel-bright uppercase text-2xl leading-tight"
            >
              {exercise.name}
            </h2>
            <p className="text-[11px] text-steel-muted mt-2 uppercase tracking-wider">
              {exercise.primaryMuscles.join(' · ').replaceAll('_', ' ')}
              {exercise.secondaryMuscles?.length
                ? ` · ${exercise.secondaryMuscles.join(' · ').replaceAll('_', ' ')}`
                : ''}
            </p>
          </div>

          {exercise.instructions && (
            <div>
              <div className="eyebrow mb-2">How to move</div>
              <p className="text-sm text-steel-bright leading-relaxed">{exercise.instructions}</p>
            </div>
          )}

          {exercise.formCues?.length ? (
            <div>
              <div className="eyebrow mb-2">Form cues</div>
              <ul className="space-y-2">
                {exercise.formCues.map((cue) => (
                  <li key={cue} className="flex gap-2 text-sm text-steel-bright">
                    <span className="text-signal-volt mt-0.5">▸</span>
                    <span>{cue}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="tag">
              {(exercise.equipmentRequired || ['bodyweight'])
                .map((e) => e.replaceAll('_', ' '))
                .join(' · ')}
            </span>
            {exercise.movementPattern && (
              <span className="tag">{exercise.movementPattern.replaceAll('_', ' ')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
