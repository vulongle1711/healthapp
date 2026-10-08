import type { Confidence } from "./nutrition";

export type Intensity = "light" | "moderate" | "vigorous";

export interface ExerciseEstimate {
  activity: string;
  duration_minutes: number;
  distance_km: number | null;
  intensity: Intensity;
  calories_burned: number;
  calories_low?: number;
  calories_high?: number;
  met: number | null;
  confidence: Confidence;
  assumptions: string[];
  emoji?: string;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  activity: string;
  duration_minutes: number;
  distance_km: number | null;
  intensity: Intensity;
  heart_rate_avg: number | null;
  calories_burned: number;
  ai_estimated: boolean;
  confidence: Confidence | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  logged_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  bedtime: string | null;
  wake_time: string | null;
  duration_minutes: number;
  quality: number | null;
  logged_at: string;
}

export interface StepLog {
  id: string;
  user_id: string;
  steps: number;
  logged_at: string;
}

export interface NoteLog {
  id: string;
  user_id: string;
  content: string;
  logged_at: string;
}
