export type User = { id: string; email: string; role: string };
export type AuthResponse = { token: string; user: User };

export type FitnessGoal = 'muscle_gain' | 'fat_loss' | 'general_fitness' | 'strength';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

/** Plan-scoped training intent (not member profile). */
export type PlanTrainingInput = {
  fitnessGoal: FitnessGoal;
  trainingExperience: TrainingExperience;
  trainingDaysPerWeek: number;
  priorityMuscleGroup?: string;
  sessionDurationMinutes?: number;
};

export type Profile = {
  name?: string;
  age: number;
  sex: 'male' | 'female';
  weightKg: number;
  heightCm: number;
  /** @deprecated Prefer PlanTrainingInput on generate — kept for legacy fallbacks. */
  fitnessGoal?: FitnessGoal;
  /** @deprecated Prefer PlanTrainingInput on generate. */
  trainingExperience?: TrainingExperience;
  /** @deprecated Prefer PlanTrainingInput on generate. */
  trainingDaysPerWeek?: number;
  /** @deprecated Prefer PlanTrainingInput on generate. */
  sessionDurationMinutes?: number;
  equipmentAvailable: string[];
  /** @deprecated Prefer PlanTrainingInput on generate. */
  priorityMuscleGroup?: string;
  limitations: string[];
};

export type GeneratePlanBody = {
  name?: string;
  select?: boolean;
} & Partial<PlanTrainingInput>;

/** Editable AI-response fields as stored on plan days (Section 8 applied). */
export type PlanExercisePatch = {
  exerciseId: string;
  action: 'KEEP' | 'SWAP' | 'ADD' | 'REMOVE';
  sets: number;
  reps: string;
  rpe?: number;
  restSeconds?: number;
};

export type PlanDayPatch = {
  dayOfWeek: string | number;
  exercises: PlanExercisePatch[];
};

export type UpdatePlanBody = {
  name?: string;
  note?: string;
  enabled?: boolean;
  aiReason?: string;
  /** Replace plan days (manual edit of AI-applied prescriptions). */
  days?: PlanDayPatch[];
} & Partial<PlanTrainingInput>;

export type Exercise = {
  _id: string;
  name: string;
  slug: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipmentRequired: string[];
  difficulty: string;
  type: string;
  instructions: string;
  formCues?: string[];
  contraindications?: string[];
  movementPattern?: string;
};

export type WorkoutExercise = {
  exerciseId: string;
  action?: string;
  sets: number;
  reps: string;
  rpe?: number;
  restSeconds?: number;
  exercise?: Exercise | null;
};

export type WorkoutDay = { dayOfWeek: string | number; exercises: WorkoutExercise[] };

export type WorkoutPlan = {
  _id: string;
  name?: string;
  note?: string;
  splitType: string;
  fitnessGoal?: FitnessGoal | null;
  trainingExperience?: TrainingExperience | null;
  priorityMuscleGroup?: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  days: WorkoutDay[];
  aiReason?: string;
  validatedBy: string;
  status: string;
  enabled?: boolean;
  isActive?: boolean;
};

export type PlanSummary = {
  planId: string;
  name: string;
  note: string;
  splitType: string;
  fitnessGoal?: FitnessGoal | null;
  trainingExperience?: TrainingExperience | null;
  priorityMuscleGroup?: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  status: string;
  enabled: boolean;
  isActive: boolean;
  aiReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TodayWorkout = {
  date: string;
  dayOfWeek: string;
  exercises: WorkoutExercise[];
  isRestDay: boolean;
  planId: string;
  planName?: string;
  splitType?: string;
  sessionDurationMinutes?: number;
};

export type ActivePlanDay = WorkoutDay & { isToday?: boolean };

export type ActivePlan = {
  planId: string;
  name?: string;
  note?: string;
  splitType: string;
  fitnessGoal?: FitnessGoal | null;
  trainingExperience?: TrainingExperience | null;
  priorityMuscleGroup?: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  weeklyVolumeTarget?: Record<string, number> | null;
  aiReason?: string | null;
  enabled?: boolean;
  isActive?: boolean;
  todayDayOfWeek: string;
  days: ActivePlanDay[];
};
