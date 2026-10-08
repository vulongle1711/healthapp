import type { Intensity } from "@/types/exercise";

/**
 * MET values (Compendium of Physical Activities, 2024 update — rounded)
 * per intensity. Active calories = (MET − 1) × kg × hours: we subtract the
 * resting MET because BMR is already counted in the daily energy estimate.
 */
export interface ActivityRef {
  name: string;
  aliases: string[];
  emoji: string;
  met: Record<Intensity, number>;
  /** km/h at which "moderate" applies, if distance-based. */
  distanceBased?: boolean;
}

export const ACTIVITY_DB: ActivityRef[] = [
  { name: "Running", aliases: ["running", "run", "ran", "jogging", "jog", "chay bo", "chay"], emoji: "🏃", met: { light: 8.0, moderate: 9.8, vigorous: 11.5 }, distanceBased: true },
  { name: "Walking", aliases: ["walking", "walk", "walked", "di bo", "di dao", "tan bo"], emoji: "🚶", met: { light: 2.8, moderate: 3.5, vigorous: 5.0 }, distanceBased: true },
  { name: "Cycling", aliases: ["cycling", "cycle", "bike", "biking", "bicycle", "dap xe", "xe dap"], emoji: "🚴", met: { light: 4.0, moderate: 6.8, vigorous: 10.0 }, distanceBased: true },
  { name: "Swimming", aliases: ["swimming", "swim", "swam", "boi", "boi loi"], emoji: "🏊", met: { light: 5.8, moderate: 8.3, vigorous: 10.0 } },
  { name: "Weight training", aliases: ["weight training", "weights", "lifting", "weightlifting", "strength training", "tap ta", "nang ta"], emoji: "🏋️", met: { light: 3.5, moderate: 5.0, vigorous: 6.0 } },
  { name: "Gym", aliases: ["gym", "workout", "tap gym", "di gym", "tap the hinh", "the hinh", "tap"], emoji: "🏋️", met: { light: 3.5, moderate: 5.0, vigorous: 6.5 } },
  { name: "HIIT", aliases: ["hiit", "circuit", "crossfit", "tabata"], emoji: "🔥", met: { light: 6.0, moderate: 8.0, vigorous: 10.0 } },
  { name: "Football", aliases: ["football", "soccer", "da bong", "da banh", "bong da", "futsal"], emoji: "⚽", met: { light: 7.0, moderate: 8.0, vigorous: 10.0 } },
  { name: "Basketball", aliases: ["basketball", "bong ro"], emoji: "🏀", met: { light: 6.0, moderate: 6.5, vigorous: 8.0 } },
  { name: "Tennis", aliases: ["tennis", "quan vot"], emoji: "🎾", met: { light: 5.0, moderate: 7.3, vigorous: 8.0 } },
  { name: "Pickleball", aliases: ["pickleball", "pickle ball"], emoji: "🏓", met: { light: 3.5, moderate: 4.5, vigorous: 6.0 } },
  { name: "Badminton", aliases: ["badminton", "cau long", "danh cau long"], emoji: "🏸", met: { light: 4.5, moderate: 5.5, vigorous: 7.0 } },
  { name: "Table tennis", aliases: ["table tennis", "ping pong", "bong ban"], emoji: "🏓", met: { light: 3.0, moderate: 4.0, vigorous: 5.5 } },
  { name: "Yoga", aliases: ["yoga"], emoji: "🧘", met: { light: 2.5, moderate: 3.0, vigorous: 4.0 } },
  { name: "Pilates", aliases: ["pilates"], emoji: "🧘", met: { light: 3.0, moderate: 3.5, vigorous: 4.5 } },
  { name: "Hiking", aliases: ["hiking", "hike", "trekking", "leo nui"], emoji: "🥾", met: { light: 5.3, moderate: 6.0, vigorous: 7.8 } },
  { name: "Dancing", aliases: ["dancing", "dance", "zumba", "nhay", "khieu vu"], emoji: "💃", met: { light: 4.5, moderate: 5.5, vigorous: 7.3 } },
  { name: "Boxing", aliases: ["boxing", "kickboxing", "muay thai", "dam boc"], emoji: "🥊", met: { light: 6.0, moderate: 7.8, vigorous: 12.0 } },
  { name: "Jump rope", aliases: ["jump rope", "skipping", "nhay day"], emoji: "🪢", met: { light: 8.8, moderate: 11.0, vigorous: 12.3 } },
  { name: "Rowing", aliases: ["rowing", "row", "cheo thuyen"], emoji: "🚣", met: { light: 4.8, moderate: 7.0, vigorous: 8.5 } },
];

export const ACTIVITY_ALIAS_INDEX = ACTIVITY_DB.flatMap((ref) => ref.aliases.map((alias) => ({ alias, ref }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

/** Speed-based MET for distance activities (rough linear fits to Compendium tables). */
export function metFromSpeed(activity: string, kmh: number): number | null {
  if (!isFinite(kmh) || kmh <= 0) return null;
  if (activity === "Running") return Math.min(19, Math.max(6, kmh * 1.0));
  if (activity === "Walking") return Math.min(7, Math.max(2.3, 0.75 * kmh));
  if (activity === "Cycling") return Math.min(16, Math.max(3.5, 0.42 * kmh));
  return null;
}

/** Active calories: (MET − 1) × weight × hours. */
export function activeCalories(met: number, weightKg: number, minutes: number): number {
  return Math.round(Math.max(0, met - 1) * weightKg * (minutes / 60));
}
