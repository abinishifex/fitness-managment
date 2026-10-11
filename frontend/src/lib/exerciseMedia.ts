export type ExerciseTypeKey =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'fullbody';

export type ExerciseTypeMeta = {
  key: ExerciseTypeKey;
  label: string;
  blurb: string;
  image: string;
  muscles: string[];
};

export const EXERCISE_TYPES: ExerciseTypeMeta[] = [
  {
    key: 'chest',
    label: 'Chest',
    blurb: 'Presses & fly patterns',
    image: '/exercises/chest.jpg',
    muscles: ['chest'],
  },
  {
    key: 'back',
    label: 'Back',
    blurb: 'Rows, pulls & hinges',
    image: '/exercises/back.jpg',
    muscles: ['back', 'lats', 'traps', 'rear_delts'],
  },
  {
    key: 'legs',
    label: 'Legs',
    blurb: 'Squats, lunges & posterior',
    image: '/exercises/legs.jpg',
    muscles: ['quads', 'hamstrings', 'glutes', 'calves'],
  },
  {
    key: 'shoulders',
    label: 'Shoulders',
    blurb: 'Presses & raises',
    image: '/exercises/shoulders.jpg',
    muscles: ['shoulders', 'front_delts', 'side_delts', 'rear_delts'],
  },
  {
    key: 'arms',
    label: 'Arms',
    blurb: 'Curl & extension work',
    image: '/exercises/arms.jpg',
    muscles: ['biceps', 'triceps', 'forearms'],
  },
  {
    key: 'core',
    label: 'Core',
    blurb: 'Stability & anti-rotation',
    image: '/exercises/core.jpg',
    muscles: ['core', 'abs', 'obliques'],
  },
  {
    key: 'fullbody',
    label: 'Full body',
    blurb: 'Compound power moves',
    image: '/exercises/fullbody.jpg',
    muscles: ['full_body'],
  },
];

const MUSCLE_TO_TYPE: Record<string, ExerciseTypeKey> = {
  chest: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  shoulders: 'shoulders',
  front_delts: 'shoulders',
  side_delts: 'shoulders',
  rear_delts: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  core: 'core',
  abs: 'core',
  obliques: 'core',
  full_body: 'fullbody',
};

export function resolveExerciseType(muscles: string[] = []): ExerciseTypeMeta {
  for (const muscle of muscles) {
    const key = MUSCLE_TO_TYPE[muscle.toLowerCase()];
    if (key) return EXERCISE_TYPES.find((t) => t.key === key)!;
  }
  return EXERCISE_TYPES.find((t) => t.key === 'fullbody')!;
}

export function getExerciseImage(muscles: string[] = []): string {
  return resolveExerciseType(muscles).image;
}

export type ExerciseMedia = {
  image: string;
  video?: string;
  poster?: string;
  hasDemo: boolean;
};

type DemoAsset = { video?: string; poster?: string };

const CHEST_DIR = '/videos/chest';
const ARM_DIR = '/videos/arm';
const CORE_DIR = '/videos/core';

function chestFile(filename: string): string {
  return `${CHEST_DIR}/${encodeURIComponent(filename)}`;
}

function armFile(filename: string): string {
  return `${ARM_DIR}/${encodeURIComponent(filename)}`;
}

function coreFile(filename: string): string {
  return `${CORE_DIR}/${encodeURIComponent(filename)}`;
}

/** Demo clips / stills keyed by catalogue slug (and common name aliases). */
const EXERCISE_DEMO_BY_SLUG: Record<string, DemoAsset> = {
  // — Chest —
  'barbell-bench-press': {
    video: chestFile('Barbell Bench Press.mp4'),
    poster: chestFile('Barbell Bench Press.jpg'),
  },
  'dumbbell-bench-press': {
    video: chestFile('Dumbbell Bench Press.mp4'),
    poster: chestFile('Dumbbell Bench Press.jpg'),
  },
  'cable-fly': {
    video: chestFile('Cable Fly.mp4'),
    poster: chestFile('Cable Fly.jpg'),
  },
  'dumbbell-fly': {
    video: chestFile('Dumbbell Fly.mp4'),
    poster: chestFile('Dumbbell Fly.jpg'),
  },
  'machine-chest-press': {
    video: chestFile('Machine Chest Press.mp4'),
    poster: chestFile('Machine Chest Press.jpg'),
  },
  'incline-dumbbell-press': { poster: chestFile('Incline Dumbbell Press.jpg') },

  // — Arms —
  'barbell-curl': { video: armFile('Barbell Curl.mp4') },
  'dumbbell-curl': { video: armFile('Dumbbell Curl.mp4') },
  'cable-curl': { video: armFile('Cable Curl.mp4') },
  'triceps-pushdown': { video: armFile('Triceps Pushdown.mp4') },
  'overhead-triceps-extension': { video: armFile('Overhead Triceps Extension.mp4') },
  'bench-dip': { video: armFile('Bench Dip.mp4') },

  // — Core —
  plank: { video: coreFile('plank.mp4') },
  'hanging-knee-raise': { video: coreFile('Hanging Knee Raise.mp4') },
  'farmer-carry': { video: coreFile('Farmer Carry.mp4') },
};

const EXERCISE_DEMO_BY_NAME: Record<string, DemoAsset> = {
  // — Chest —
  'barbell bench press': EXERCISE_DEMO_BY_SLUG['barbell-bench-press'],
  'dumbbell bench press': EXERCISE_DEMO_BY_SLUG['dumbbell-bench-press'],
  'cable fly': EXERCISE_DEMO_BY_SLUG['cable-fly'],
  'dumbbell fly': EXERCISE_DEMO_BY_SLUG['dumbbell-fly'],
  'machine chest press': EXERCISE_DEMO_BY_SLUG['machine-chest-press'],
  'incline dumbbell press': EXERCISE_DEMO_BY_SLUG['incline-dumbbell-press'],

  // — Arms —
  'barbell curl': EXERCISE_DEMO_BY_SLUG['barbell-curl'],
  'dumbbell curl': EXERCISE_DEMO_BY_SLUG['dumbbell-curl'],
  'cable curl': EXERCISE_DEMO_BY_SLUG['cable-curl'],
  'triceps pushdown': EXERCISE_DEMO_BY_SLUG['triceps-pushdown'],
  'overhead triceps extension': EXERCISE_DEMO_BY_SLUG['overhead-triceps-extension'],
  'bench dip': EXERCISE_DEMO_BY_SLUG['bench-dip'],

  // — Core —
  plank: EXERCISE_DEMO_BY_SLUG['plank'],
  'hanging knee raise': EXERCISE_DEMO_BY_SLUG['hanging-knee-raise'],
  'farmer carry': EXERCISE_DEMO_BY_SLUG['farmer-carry'],
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_]+/g, ' ').replace(/\s+/g, ' ');
}

export function getExerciseDemo(exercise?: {
  slug?: string;
  name?: string;
} | null): DemoAsset | null {
  if (!exercise) return null;
  if (exercise.slug && EXERCISE_DEMO_BY_SLUG[exercise.slug]) {
    return EXERCISE_DEMO_BY_SLUG[exercise.slug];
  }
  if (exercise.name) {
    const byName = EXERCISE_DEMO_BY_NAME[normalizeKey(exercise.name)];
    if (byName) return byName;
  }
  return null;
}

export function getExerciseMedia(
  muscles: string[] = [],
  exercise?: { slug?: string; name?: string } | null
): ExerciseMedia {
  const fallback = getExerciseImage(muscles);
  const demo = getExerciseDemo(exercise);
  if (!demo) {
    return { image: fallback, hasDemo: false };
  }
  return {
    image: demo.poster || fallback,
    video: demo.video,
    poster: demo.poster || fallback,
    hasDemo: Boolean(demo.video || demo.poster),
  };
}

export const WORKOUT_HERO = '/exercises/workout-hero.jpg';
