export type User = { id: string; email: string; role: string };
export type AuthResponse = { token: string; user: User };

export type Profile = {
  age: number; sex: 'male' | 'female'; weightKg: number; heightCm: number;
  fitnessGoal: 'muscle_gain' | 'fat_loss' | 'general_fitness' | 'strength';
  trainingExperience: 'beginner' | 'intermediate' | 'advanced';
  trainingDaysPerWeek: number; sessionDurationMinutes: number;
  equipmentAvailable: string[]; priorityMuscleGroup?: string; limitations: string[];
};

export type Exercise = {
  _id: string; name: string; slug: string; primaryMuscles: string[];
  equipmentRequired: string[]; difficulty: string; type: string;
  instructions: string; formCues?: string[]; contraindications?: string[];
};

export type WorkoutExercise = { exerciseId: string; action?: string; sets: number; reps: string; rpe?: number; restSeconds?: number };
export type WorkoutDay = { dayOfWeek: string | number; exercises: WorkoutExercise[] };
export type WorkoutPlan = { _id: string; splitType: string; trainingDaysPerWeek: number; sessionDurationMinutes: number; days: WorkoutDay[]; aiReason?: string; validatedBy: string; status: string };
export type TodayWorkout = { date: string; dayOfWeek: string; exercises: WorkoutExercise[]; isRestDay: boolean; planId: string };
