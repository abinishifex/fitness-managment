'use client';

import { useEffect, useRef, useState } from 'react';
import type { ExerciseMedia } from '@/lib/exerciseMedia';

type Props = {
  media: ExerciseMedia;
  name: string;
  targetReps: string;
  restSeconds: number;
  muscles: string;
  exerciseType?: string;
  completedSets: number;
  totalSets: number;
};

export function ExerciseDemo({
  media,
  name,
  targetReps,
  restSeconds,
  muscles,
  exerciseType,
  completedSets,
  totalSets,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(Boolean(media.video));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setPlaying(Boolean(media.video));
    const el = videoRef.current;
    if (!el || !media.video) return;
    el.load();
    const play = el.play();
    if (play) play.catch(() => setPlaying(false));
  }, [media.video, name]);

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

  const showVideo = Boolean(media.video) && !failed;

  return (
    <div className="relative flex-1 min-h-[280px] md:min-h-[360px] overflow-hidden border border-surface-highlight">
      {showVideo ? (
        <video
          key={media.video}
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.82] contrast-110"
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
          alt={name}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.75] contrast-125 animate-ken-burns"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />

      <div className="relative z-10 h-full flex flex-col justify-between p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-2 bg-surface-overlay/90 border border-signal-volt/40 px-3 py-1 text-label-telemetry text-signal-volt uppercase tracking-widest text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-volt animate-ping" />
            {showVideo && playing ? 'Demo loop' : 'Active lift'}
          </span>
          {showVideo && (
            <button
              type="button"
              onClick={togglePlayback}
              className="inline-flex items-center justify-center w-9 h-9 border border-surface-highlight bg-surface-overlay/85 text-signal-volt hover:border-signal-volt transition-colors"
              aria-label={playing ? 'Pause demo' : 'Play demo'}
            >
              <span className="material-symbols-outlined text-xl">
                {playing ? 'pause' : 'play_arrow'}
              </span>
            </button>
          )}
        </div>

        <div>
          <p className="text-label-telemetry text-signal-volt uppercase tracking-wider text-xs mb-1">
            {exerciseType || 'movement'} · {muscles}
          </p>
          <h2 className="font-headline-xl text-2xl md:text-4xl uppercase text-steel-bright leading-none">
            {name}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="tag">
              {completedSets}/{totalSets} sets
            </span>
            <span className="tag">{targetReps} reps</span>
            <span className="tag">Rest {restSeconds}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
