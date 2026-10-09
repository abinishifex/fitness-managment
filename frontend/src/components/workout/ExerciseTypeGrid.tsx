'use client';

import Link from 'next/link';
import { EXERCISE_TYPES } from '@/lib/exerciseMedia';

type Props = {
  hrefBase?: string;
  compact?: boolean;
};

export function ExerciseTypeGrid({ hrefBase = '/app/exercises', compact }: Props) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
      {EXERCISE_TYPES.map((type, i) => (
        <Link
          key={type.key}
          href={`${hrefBase}?type=${type.key}`}
          className="group relative overflow-hidden border border-surface-highlight h-40 sm:h-48 animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={type.image}
            alt={type.label}
            className="absolute inset-0 w-full h-full object-cover brightness-[0.72] contrast-125 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/40 to-transparent" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-signal-volt/10" />
          <div className="relative z-10 h-full flex flex-col justify-end p-4">
            <span className="text-label-telemetry text-signal-volt uppercase tracking-wider text-[10px]">
              {type.blurb}
            </span>
            <h3 className="font-headline-md text-steel-bright uppercase text-xl leading-none mt-1">
              {type.label}
            </h3>
          </div>
        </Link>
      ))}
    </div>
  );
}
