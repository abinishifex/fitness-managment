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
const BACK_DIR = '/videos/back';

function mediaFile(dir: string, filename: string): string {
  return `${dir}/${encodeURIComponent(filename)}`;
}

function chestFile(filename: string): string {
  return mediaFile(CHEST_DIR, filename);
}

function backFile(filename: string): string {
  return mediaFile(BACK_DIR, filename);
}

/** Demo clips / stills keyed by catalogue slug (and common name aliases). */
const EXERCISE_DEMO_BY_SLUG: Record<string, DemoAsset> = {
  // —— Chest ——
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

  // —— Back ——
  'conventional-deadlift': {
    video: backFile('Conventional Deadlift.mp4'),
    poster: backFile('Conventional Deadlift.jpg'),
  },
  'barbell-bent-over-row': {
    video: backFile('Barbell Bent-Over Row.mp4'),
    poster: backFile('Barbell Bent-Over Row.jpg'),
  },
  'chest-supported-dumbbell-row': {
    video: backFile('Chest-Supported Dumbbell Row.mp4'),
    poster: backFile('Chest-Supported Dumbbell Row.jpg'),
  },
  'seated-cable-row': {
    video: backFile('Seated Cable Row.mp4'),
    poster: backFile('Seated Cable Row.jpg'),
  },
  'lat-pulldown': {
    video: backFile('Lat Pulldown.mp4'),
    poster: backFile('Lat Pulldown.jpg'),
  },
  'pull-up': {
    video: backFile('Pull-Up.mp4'),
    poster: backFile('Pull-Up.jpg'),
  },
  'assisted-pull-up': {
    video: backFile('Assisted Pull-Up.mp4'),
    poster: backFile('Assisted Pull-Up.jpg'),
  },
  'single-arm-dumbbell-row': {
    video: backFile('Single-Arm Dumbbell Row.mp4'),
    poster: backFile('Single-Arm Dumbbell Row.jpg'),
  },
};

const EXERCISE_DEMO_BY_NAME: Record<string, DemoAsset> = {
  'barbell bench press': EXERCISE_DEMO_BY_SLUG['barbell-bench-press'],
  'dumbbell bench press': EXERCISE_DEMO_BY_SLUG['dumbbell-bench-press'],
  'cable fly': EXERCISE_DEMO_BY_SLUG['cable-fly'],
  'dumbbell fly': EXERCISE_DEMO_BY_SLUG['dumbbell-fly'],
  'machine chest press': EXERCISE_DEMO_BY_SLUG['machine-chest-press'],
  'incline dumbbell press': EXERCISE_DEMO_BY_SLUG['incline-dumbbell-press'],
  'conventional deadlift': EXERCISE_DEMO_BY_SLUG['conventional-deadlift'],
  'barbell bent-over row': EXERCISE_DEMO_BY_SLUG['barbell-bent-over-row'],
  'barbell bent over row': EXERCISE_DEMO_BY_SLUG['barbell-bent-over-row'],
  'chest-supported dumbbell row': EXERCISE_DEMO_BY_SLUG['chest-supported-dumbbell-row'],
  'chest supported dumbbell row': EXERCISE_DEMO_BY_SLUG['chest-supported-dumbbell-row'],
  'seated cable row': EXERCISE_DEMO_BY_SLUG['seated-cable-row'],
  'lat pulldown': EXERCISE_DEMO_BY_SLUG['lat-pulldown'],
  'pull-up': EXERCISE_DEMO_BY_SLUG['pull-up'],
  'pull up': EXERCISE_DEMO_BY_SLUG['pull-up'],
  'assisted pull-up': EXERCISE_DEMO_BY_SLUG['assisted-pull-up'],
  'assisted pull up': EXERCISE_DEMO_BY_SLUG['assisted-pull-up'],
  'single-arm dumbbell row': EXERCISE_DEMO_BY_SLUG['single-arm-dumbbell-row'],
  'single arm dumbbell row': EXERCISE_DEMO_BY_SLUG['single-arm-dumbbell-row'],
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
