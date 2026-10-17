export type ExerciseTypeKey =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'fullbody'
  | 'calisthenics';

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
    blurb: 'Existing compounds · small sets',
    image: '/exercises/fullbody.jpg',
    // Full body sessions pull compounds from every region (not a separate muscle tag).
    muscles: [
      'chest',
      'back',
      'lats',
      'traps',
      'quads',
      'hamstrings',
      'glutes',
      'shoulders',
      'front_delts',
      'side_delts',
      'rear_delts',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'abs',
      'obliques',
    ],
  },
  {
    key: 'calisthenics',
    label: 'Calisthenics',
    blurb: 'Bodyweight mastery',
    image: '/exercises/calisthenics.jpg',
    muscles: ['calisthenics'],
  },
];

const MUSCLE_TO_TYPE: Record<string, ExerciseTypeKey> = {
  chest: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  upper_back: 'back',
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
  calisthenics: 'calisthenics',
};

export function resolveExerciseType(muscles: string[] = []): ExerciseTypeMeta {
  for (const muscle of muscles) {
    const key = MUSCLE_TO_TYPE[muscle.toLowerCase()];
    if (key) return EXERCISE_TYPES.find((t) => t.key === key)!;
  }
  return EXERCISE_TYPES.find((t) => t.key === 'fullbody')!;
}

/**
 * Full body is not its own muscle group — it is the compound lifts already
 * catalogued under chest/back/legs/etc., used together in small-set sessions.
 */
export function matchesExerciseType(
  exercise: { primaryMuscles?: string[]; type?: string },
  typeKey: ExerciseTypeKey
): boolean {
  if (typeKey === 'fullbody') {
    return String(exercise.type || '').toLowerCase() === 'compound';
  }
  return resolveExerciseType(exercise.primaryMuscles || []).key === typeKey;
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

// ─── Video directory roots ────────────────────────────────────────────────────
const CHEST_DIR     = '/videos/chest';
const BACK_DIR      = '/videos/back';
const LEGS_DIR      = '/videos/legs';
const SHOULDERS_DIR = '/videos/shoulder'; // folder name is singular
const ARM_DIR       = '/videos/arm';
const CORE_DIR      = '/videos/core';

/** Encode a filename so spaces → %20, hyphens are safe. */
function f(dir: string, filename: string): string {
  return `${dir}/${encodeURIComponent(filename)}`;
}

// ─── Slug → asset map (exact filenames from public/videos/*) ─────────────────
const EXERCISE_DEMO_BY_SLUG: Record<string, DemoAsset> = {

  // ── Chest (/videos/chest/) ────────────────────────────────────────────────
  'barbell-bench-press':    { video: f(CHEST_DIR, 'Barbell Bench Press.mp4'),    poster: f(CHEST_DIR, 'Barbell Bench Press.jpg') },
  'dumbbell-bench-press':   { video: f(CHEST_DIR, 'Dumbbell Bench Press.mp4'),   poster: f(CHEST_DIR, 'Dumbbell Bench Press.jpg') },
  'incline-dumbbell-press': {                                                     poster: f(CHEST_DIR, 'Incline Dumbbell Press.jpg') },
  'cable-fly':              { video: f(CHEST_DIR, 'Cable Fly.mp4'),              poster: f(CHEST_DIR, 'Cable Fly.jpg') },
  'dumbbell-fly':           { video: f(CHEST_DIR, 'Dumbbell Fly.mp4'),           poster: f(CHEST_DIR, 'Dumbbell Fly.jpg') },
  'machine-chest-press':    { video: f(CHEST_DIR, 'Machine Chest Press.mp4'),    poster: f(CHEST_DIR, 'Machine Chest Press.jpg') },
  'push-up':                { video: f(CHEST_DIR, 'Push-Up.mp4'),                poster: f(CHEST_DIR, 'Push-Up.jpg') },

  // ── Back (/videos/back/) ──────────────────────────────────────────────────
  'conventional-deadlift':        { video: f(BACK_DIR, 'Conventional Deadlift.mp4'),        poster: f(BACK_DIR, 'Conventional Deadlift.jpg') },
  'barbell-bent-over-row':        { video: f(BACK_DIR, 'Barbell Bent-Over Row.mp4'),        poster: f(BACK_DIR, 'Barbell Bent-Over Row.jpg') },
  'chest-supported-dumbbell-row': { video: f(BACK_DIR, 'Chest-Supported Dumbbell Row.mp4'), poster: f(BACK_DIR, 'Chest-Supported Dumbbell Row.jpg') },
  'seated-cable-row':             { video: f(BACK_DIR, 'Seated Cable Row.mp4'),             poster: f(BACK_DIR, 'Seated Cable Row.jpg') },
  'lat-pulldown':                 { video: f(BACK_DIR, 'Lat Pulldown.mp4'),                 poster: f(BACK_DIR, 'Lat Pulldown.jpg') },
  'pull-up':                      { video: f(BACK_DIR, 'Pull-Up.mp4'),                      poster: f(BACK_DIR, 'Pull-Up.jpg') },
  'assisted-pull-up':             { video: f(BACK_DIR, 'Assisted Pull-Up.mp4'),             poster: f(BACK_DIR, 'Assisted Pull-Up.jpg') },
  'single-arm-dumbbell-row':      { video: f(BACK_DIR, 'Single-Arm Dumbbell Row.mp4'),      poster: f(BACK_DIR, 'Single-Arm Dumbbell Row.jpg') },
  // No video file: romanian-deadlift, trap-bar-deadlift, face-pull*, band-pull-apart*
  // *face-pull and band-pull-apart are in /videos/shoulder — mapped there below

  // ── Legs (/videos/legs/) ──────────────────────────────────────────────────
  'back-squat':            { video: f(LEGS_DIR, 'Back Squat.mp4'),            poster: f(LEGS_DIR, 'Back Squat.jpg') },
  'front-squat':           { video: f(LEGS_DIR, 'Front Squat.mp4'),           poster: f(LEGS_DIR, 'Front Squat.jpg') },
  'goblet-squat':          { video: f(LEGS_DIR, 'Goblet Squat.mp4'),          poster: f(LEGS_DIR, 'Goblet Squat.jpg') },
  'leg-press':             { video: f(LEGS_DIR, 'Leg Press.mp4'),             poster: f(LEGS_DIR, 'Leg Press.jpg') },
  'hack-squat':            { video: f(LEGS_DIR, 'Hack Squat.mp4'),            poster: f(LEGS_DIR, 'Hack Squat.jpg') },
  'bulgarian-split-squat': { video: f(LEGS_DIR, 'Bulgarian Split Squat.mp4'), poster: f(LEGS_DIR, 'Bulgarian Split Squat.jpg') },
  'walking-lunge':         { video: f(LEGS_DIR, 'Dumbbell Walking Lunge.mp4'),poster: f(LEGS_DIR, 'Dumbbell Walking Lunge.jpg') },
  'dumbbell-walking-lunge':{ video: f(LEGS_DIR, 'Dumbbell Walking Lunge.mp4'),poster: f(LEGS_DIR, 'Dumbbell Walking Lunge.jpg') },
  'leg-curl':              { video: f(LEGS_DIR, 'Leg Curl.mp4'),              poster: f(LEGS_DIR, 'Leg Curl.jpg') },
  'leg-extension':         { video: f(LEGS_DIR, 'Leg Extension.mp4'),         poster: f(LEGS_DIR, 'Leg Extension.jpg') },
  'hip-thrust':            { video: f(LEGS_DIR, 'Hip Thrust.mp4'),            poster: f(LEGS_DIR, 'Hip Thrust.jpg') },
  'glute-bridge':          { video: f(LEGS_DIR, 'Glute Bridge.mp4'),          poster: f(LEGS_DIR, 'Glute Bridge.jpg') },
  'dumbbell-rdl':          { video: f(LEGS_DIR, 'Dumbbell RDL.mp4'),          poster: f(LEGS_DIR, 'Dumbbell RDL.jpg') },
  'good-morning':          { video: f(LEGS_DIR, 'Good Morning.mp4'),          poster: f(LEGS_DIR, 'Good Morning.jpg') },
  'kettlebell-swing':      { video: f(LEGS_DIR, 'Kettlebell Swing.mp4'),      poster: f(LEGS_DIR, 'Kettlebell Swing.jpg') },
  // No video file: standing-calf-raise, seated-calf-raise, romanian-deadlift

  // ── Shoulders (/videos/shoulder/) ────────────────────────────────────────
  'overhead-press':          { video: f(SHOULDERS_DIR, 'Overhead Press.mp4'),          poster: f(SHOULDERS_DIR, 'Overhead Press.jpg') },
  'dumbbell-shoulder-press': { video: f(SHOULDERS_DIR, 'Dumbbell Shoulder Press.mp4'), poster: f(SHOULDERS_DIR, 'Dumbbell Shoulder Press.jpg') },
  'machine-shoulder-press':  { video: f(SHOULDERS_DIR, 'Machine Shoulder Press.mp4'),  poster: f(SHOULDERS_DIR, 'Machine Shoulder Press.jpg') },
  'landmine-press':          { video: f(SHOULDERS_DIR, 'Landmine Press.mp4'),          poster: f(SHOULDERS_DIR, 'Landmine Press.jpg') },
  'lateral-raise':           { video: f(SHOULDERS_DIR, 'Lateral Raise.mp4'),           poster: f(SHOULDERS_DIR, 'Lateral Raise.jpg') },
  'cable-lateral-raise':     { video: f(SHOULDERS_DIR, 'Cable Lateral Raise.mp4'),     poster: f(SHOULDERS_DIR, 'Cable Lateral Raise.jpg') },
  'rear-delt-fly':           { video: f(SHOULDERS_DIR, 'Rear Delt Fly.mp4'),           poster: f(SHOULDERS_DIR, 'Rear Delt Fly.jpg') },
  'face-pull':               { video: f(SHOULDERS_DIR, 'Face Pull.mp4'),               poster: f(SHOULDERS_DIR, 'Face Pull.jpg') },
  'band-pull-apart':         { video: f(SHOULDERS_DIR, 'Band Pull-Apart.mp4'),         poster: f(SHOULDERS_DIR, 'Band Pull-Apart.jpg') },

  // ── Arms (/videos/arm/) ───────────────────────────────────────────────────
  'barbell-curl':               { video: f(ARM_DIR, 'Barbell Curl.mp4') },
  'dumbbell-curl':              { video: f(ARM_DIR, 'Dumbbell Curl.mp4') },
  'cable-curl':                 { video: f(ARM_DIR, 'Cable Curl.mp4') },
  'triceps-pushdown':           { video: f(ARM_DIR, 'Triceps Pushdown.mp4') },
  'overhead-triceps-extension': { video: f(ARM_DIR, 'Overhead Triceps Extension.mp4') },
  'bench-dip':                  { video: f(ARM_DIR, 'Bench Dip.mp4') },

  // ── Core (/videos/core/) ──────────────────────────────────────────────────
  'plank':              { video: f(CORE_DIR, 'plank.mp4') },            // lowercase on disk
  'hanging-knee-raise': { video: f(CORE_DIR, 'Hanging Knee Raise.mp4') },
  'farmer-carry':       { video: f(CORE_DIR, 'Farmer Carry.mp4') },
};

// ─── Name → asset map (normalised lowercase, covers hyphen/space variants) ───
const EXERCISE_DEMO_BY_NAME: Record<string, DemoAsset> = {
  // Chest
  'barbell bench press':    EXERCISE_DEMO_BY_SLUG['barbell-bench-press'],
  'dumbbell bench press':   EXERCISE_DEMO_BY_SLUG['dumbbell-bench-press'],
  'incline dumbbell press': EXERCISE_DEMO_BY_SLUG['incline-dumbbell-press'],
  'cable fly':              EXERCISE_DEMO_BY_SLUG['cable-fly'],
  'dumbbell fly':           EXERCISE_DEMO_BY_SLUG['dumbbell-fly'],
  'machine chest press':    EXERCISE_DEMO_BY_SLUG['machine-chest-press'],
  'push-up':                EXERCISE_DEMO_BY_SLUG['push-up'],
  'push up':                EXERCISE_DEMO_BY_SLUG['push-up'],

  // Back
  'conventional deadlift':          EXERCISE_DEMO_BY_SLUG['conventional-deadlift'],
  'barbell bent-over row':          EXERCISE_DEMO_BY_SLUG['barbell-bent-over-row'],
  'barbell bent over row':          EXERCISE_DEMO_BY_SLUG['barbell-bent-over-row'],
  'chest-supported dumbbell row':   EXERCISE_DEMO_BY_SLUG['chest-supported-dumbbell-row'],
  'chest supported dumbbell row':   EXERCISE_DEMO_BY_SLUG['chest-supported-dumbbell-row'],
  'seated cable row':               EXERCISE_DEMO_BY_SLUG['seated-cable-row'],
  'lat pulldown':                   EXERCISE_DEMO_BY_SLUG['lat-pulldown'],
  'pull-up':                        EXERCISE_DEMO_BY_SLUG['pull-up'],
  'pull up':                        EXERCISE_DEMO_BY_SLUG['pull-up'],
  'assisted pull-up':               EXERCISE_DEMO_BY_SLUG['assisted-pull-up'],
  'assisted pull up':               EXERCISE_DEMO_BY_SLUG['assisted-pull-up'],
  'single-arm dumbbell row':        EXERCISE_DEMO_BY_SLUG['single-arm-dumbbell-row'],
  'single arm dumbbell row':        EXERCISE_DEMO_BY_SLUG['single-arm-dumbbell-row'],

  // Legs
  'back squat':             EXERCISE_DEMO_BY_SLUG['back-squat'],
  'front squat':            EXERCISE_DEMO_BY_SLUG['front-squat'],
  'goblet squat':           EXERCISE_DEMO_BY_SLUG['goblet-squat'],
  'leg press':              EXERCISE_DEMO_BY_SLUG['leg-press'],
  'hack squat':             EXERCISE_DEMO_BY_SLUG['hack-squat'],
  'bulgarian split squat':  EXERCISE_DEMO_BY_SLUG['bulgarian-split-squat'],
  'walking lunge':          EXERCISE_DEMO_BY_SLUG['walking-lunge'],
  'dumbbell walking lunge': EXERCISE_DEMO_BY_SLUG['dumbbell-walking-lunge'],
  'leg curl':               EXERCISE_DEMO_BY_SLUG['leg-curl'],
  'leg extension':          EXERCISE_DEMO_BY_SLUG['leg-extension'],
  'hip thrust':             EXERCISE_DEMO_BY_SLUG['hip-thrust'],
  'glute bridge':           EXERCISE_DEMO_BY_SLUG['glute-bridge'],
  'dumbbell rdl':           EXERCISE_DEMO_BY_SLUG['dumbbell-rdl'],
  'romanian deadlift':      EXERCISE_DEMO_BY_SLUG['dumbbell-rdl'], // closest available
  'good morning':           EXERCISE_DEMO_BY_SLUG['good-morning'],
  'kettlebell swing':       EXERCISE_DEMO_BY_SLUG['kettlebell-swing'],

  // Shoulders
  'overhead press':          EXERCISE_DEMO_BY_SLUG['overhead-press'],
  'dumbbell shoulder press': EXERCISE_DEMO_BY_SLUG['dumbbell-shoulder-press'],
  'machine shoulder press':  EXERCISE_DEMO_BY_SLUG['machine-shoulder-press'],
  'landmine press':          EXERCISE_DEMO_BY_SLUG['landmine-press'],
  'lateral raise':           EXERCISE_DEMO_BY_SLUG['lateral-raise'],
  'cable lateral raise':     EXERCISE_DEMO_BY_SLUG['cable-lateral-raise'],
  'rear delt fly':           EXERCISE_DEMO_BY_SLUG['rear-delt-fly'],
  'face pull':               EXERCISE_DEMO_BY_SLUG['face-pull'],
  'band pull-apart':         EXERCISE_DEMO_BY_SLUG['band-pull-apart'],
  'band pull apart':         EXERCISE_DEMO_BY_SLUG['band-pull-apart'],

  // Arms
  'barbell curl':               EXERCISE_DEMO_BY_SLUG['barbell-curl'],
  'dumbbell curl':              EXERCISE_DEMO_BY_SLUG['dumbbell-curl'],
  'cable curl':                 EXERCISE_DEMO_BY_SLUG['cable-curl'],
  'triceps pushdown':           EXERCISE_DEMO_BY_SLUG['triceps-pushdown'],
  'overhead triceps extension': EXERCISE_DEMO_BY_SLUG['overhead-triceps-extension'],
  'bench dip':                  EXERCISE_DEMO_BY_SLUG['bench-dip'],

  // Core
  'plank':              EXERCISE_DEMO_BY_SLUG['plank'],
  'hanging knee raise': EXERCISE_DEMO_BY_SLUG['hanging-knee-raise'],
  'farmer carry':       EXERCISE_DEMO_BY_SLUG['farmer-carry'],
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
