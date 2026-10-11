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
<<<<<<< HEAD
const ARM_DIR = '/videos/arm';
const CORE_DIR = '/videos/core';
=======
const BACK_DIR = '/videos/back';
const LEGS_DIR = '/videos/legs';
const SHOULDERS_DIR = '/videos/shoulder';

function mediaFile(dir: string, filename: string): string {
  return `${dir}/${encodeURIComponent(filename)}`;
}
>>>>>>> 3ae5ec5e557ee481655bec770c34968850707f35

function chestFile(filename: string): string {
  return mediaFile(CHEST_DIR, filename);
}

function backFile(filename: string): string {
  return mediaFile(BACK_DIR, filename);
}

function legsFile(filename: string): string {
  return mediaFile(LEGS_DIR, filename);
}

function shouldersFile(filename: string): string {
  return mediaFile(SHOULDERS_DIR, filename);
}

function armFile(filename: string): string {
  return `${ARM_DIR}/${encodeURIComponent(filename)}`;
}

function coreFile(filename: string): string {
  return `${CORE_DIR}/${encodeURIComponent(filename)}`;
}

/** Demo clips / stills keyed by catalogue slug (and common name aliases). */
const EXERCISE_DEMO_BY_SLUG: Record<string, DemoAsset> = {
<<<<<<< HEAD
  // — Chest —
=======
  // —— Chest ——
>>>>>>> 3ae5ec5e557ee481655bec770c34968850707f35
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
  'push-up': {
    video: chestFile('Push-Up.mp4'),
    poster: chestFile('Push-Up.jpg'),
  },
  'incline-dumbbell-press': { poster: chestFile('Incline Dumbbell Press.jpg') },

<<<<<<< HEAD
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
=======
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

  // —— Legs ——
  'back-squat': {
    video: legsFile('Back Squat.mp4'),
    poster: legsFile('Back Squat.jpg'),
  },
  'front-squat': {
    video: legsFile('Front Squat.mp4'),
    poster: legsFile('Front Squat.jpg'),
  },
  'goblet-squat': {
    video: legsFile('Goblet Squat.mp4'),
    poster: legsFile('Goblet Squat.jpg'),
  },
  'hack-squat': {
    video: legsFile('Hack Squat.mp4'),
    poster: legsFile('Hack Squat.jpg'),
  },
  'leg-press': {
    video: legsFile('Leg Press.mp4'),
    poster: legsFile('Leg Press.jpg'),
  },
  'bulgarian-split-squat': {
    video: legsFile('Bulgarian Split Squat.mp4'),
    poster: legsFile('Bulgarian Split Squat.jpg'),
  },
  'leg-curl': {
    video: legsFile('Leg Curl.mp4'),
    poster: legsFile('Leg Curl.jpg'),
  },
  'leg-extension': {
    video: legsFile('Leg Extension.mp4'),
    poster: legsFile('Leg Extension.jpg'),
  },
  'hip-thrust': {
    video: legsFile('Hip Thrust.mp4'),
    poster: legsFile('Hip Thrust.jpg'),
  },
  'glute-bridge': {
    video: legsFile('Glute Bridge.mp4'),
    poster: legsFile('Glute Bridge.jpg'),
  },
  'dumbbell-rdl': {
    video: legsFile('Dumbbell RDL.mp4'),
    poster: legsFile('Dumbbell RDL.jpg'),
  },
  'good-morning': {
    video: legsFile('Good Morning.mp4'),
    poster: legsFile('Good Morning.jpg'),
  },
  'kettlebell-swing': {
    video: legsFile('Kettlebell Swing.mp4'),
    poster: legsFile('Kettlebell Swing.jpg'),
  },
  'dumbbell-walking-lunge': {
    video: legsFile('Dumbbell Walking Lunge.mp4'),
    poster: legsFile('Dumbbell Walking Lunge.jpg'),
  },

  // —— Shoulders ——
  'overhead-press': {
    video: shouldersFile('Overhead Press.mp4'),
    poster: shouldersFile('Overhead Press.jpg'),
  },
  'dumbbell-shoulder-press': {
    video: shouldersFile('Dumbbell Shoulder Press.mp4'),
    poster: shouldersFile('Dumbbell Shoulder Press.jpg'),
  },
  'machine-shoulder-press': {
    video: shouldersFile('Machine Shoulder Press.mp4'),
    poster: shouldersFile('Machine Shoulder Press.jpg'),
  },
  'landmine-press': {
    video: shouldersFile('Landmine Press.mp4'),
    poster: shouldersFile('Landmine Press.jpg'),
  },
  'lateral-raise': {
    video: shouldersFile('Lateral Raise.mp4'),
    poster: shouldersFile('Lateral Raise.jpg'),
  },
  'cable-lateral-raise': {
    video: shouldersFile('Cable Lateral Raise.mp4'),
    poster: shouldersFile('Cable Lateral Raise.jpg'),
  },
  'rear-delt-fly': {
    video: shouldersFile('Rear Delt Fly.mp4'),
    poster: shouldersFile('Rear Delt Fly.jpg'),
  },
  // Assets live under /videos/shoulder
  'face-pull': {
    video: shouldersFile('Face Pull.mp4'),
    poster: shouldersFile('Face Pull.jpg'),
  },
  'band-pull-apart': {
    video: shouldersFile('Band Pull-Apart.mp4'),
    poster: shouldersFile('Band Pull-Apart.jpg'),
  },
>>>>>>> 3ae5ec5e557ee481655bec770c34968850707f35
};

const EXERCISE_DEMO_BY_NAME: Record<string, DemoAsset> = {
  // — Chest —
  'barbell bench press': EXERCISE_DEMO_BY_SLUG['barbell-bench-press'],
  'dumbbell bench press': EXERCISE_DEMO_BY_SLUG['dumbbell-bench-press'],
  'cable fly': EXERCISE_DEMO_BY_SLUG['cable-fly'],
  'dumbbell fly': EXERCISE_DEMO_BY_SLUG['dumbbell-fly'],
  'machine chest press': EXERCISE_DEMO_BY_SLUG['machine-chest-press'],
  'push-up': EXERCISE_DEMO_BY_SLUG['push-up'],
  'push up': EXERCISE_DEMO_BY_SLUG['push-up'],
  'incline dumbbell press': EXERCISE_DEMO_BY_SLUG['incline-dumbbell-press'],
<<<<<<< HEAD

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
=======
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
  'back squat': EXERCISE_DEMO_BY_SLUG['back-squat'],
  'front squat': EXERCISE_DEMO_BY_SLUG['front-squat'],
  'goblet squat': EXERCISE_DEMO_BY_SLUG['goblet-squat'],
  'hack squat': EXERCISE_DEMO_BY_SLUG['hack-squat'],
  'leg press': EXERCISE_DEMO_BY_SLUG['leg-press'],
  'bulgarian split squat': EXERCISE_DEMO_BY_SLUG['bulgarian-split-squat'],
  'leg curl': EXERCISE_DEMO_BY_SLUG['leg-curl'],
  'leg extension': EXERCISE_DEMO_BY_SLUG['leg-extension'],
  'hip thrust': EXERCISE_DEMO_BY_SLUG['hip-thrust'],
  'glute bridge': EXERCISE_DEMO_BY_SLUG['glute-bridge'],
  'dumbbell rdl': EXERCISE_DEMO_BY_SLUG['dumbbell-rdl'],
  'good morning': EXERCISE_DEMO_BY_SLUG['good-morning'],
  'kettlebell swing': EXERCISE_DEMO_BY_SLUG['kettlebell-swing'],
  'dumbbell walking lunge': EXERCISE_DEMO_BY_SLUG['dumbbell-walking-lunge'],
  'walking lunge': EXERCISE_DEMO_BY_SLUG['dumbbell-walking-lunge'],
  'overhead press': EXERCISE_DEMO_BY_SLUG['overhead-press'],
  'dumbbell shoulder press': EXERCISE_DEMO_BY_SLUG['dumbbell-shoulder-press'],
  'machine shoulder press': EXERCISE_DEMO_BY_SLUG['machine-shoulder-press'],
  'landmine press': EXERCISE_DEMO_BY_SLUG['landmine-press'],
  'lateral raise': EXERCISE_DEMO_BY_SLUG['lateral-raise'],
  'cable lateral raise': EXERCISE_DEMO_BY_SLUG['cable-lateral-raise'],
  'rear delt fly': EXERCISE_DEMO_BY_SLUG['rear-delt-fly'],
  'face pull': EXERCISE_DEMO_BY_SLUG['face-pull'],
  'band pull-apart': EXERCISE_DEMO_BY_SLUG['band-pull-apart'],
  'band pull apart': EXERCISE_DEMO_BY_SLUG['band-pull-apart'],
>>>>>>> 3ae5ec5e557ee481655bec770c34968850707f35
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
