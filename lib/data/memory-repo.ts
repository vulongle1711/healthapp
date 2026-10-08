import type { Repo, LogBundle, NewFoodItem, NewExercise } from "./types";
import type { Profile, ProfileInput } from "@/types/user";
import type { MealType, UserFood } from "@/types/nutrition";
import type { WeightLog } from "@/types/exercise";
import { buildDemoData, demoId, DEMO_USER_ID } from "./seed";

interface Store {
  profile: Profile | null;
  logs: LogBundle;
  userFoods: UserFood[];
}

const g = globalThis as unknown as { __nhipDemoStore?: Store };

function store(): Store {
  if (!g.__nhipDemoStore) g.__nhipDemoStore = buildDemoData();
  return g.__nhipDemoStore;
}

export function resetDemoStore(empty = false) {
  g.__nhipDemoStore = empty
    ? { profile: null, logs: { food: [], exercise: [], water: [], weight: [], sleep: [], steps: [], notes: [] }, userFoods: [] }
    : buildDemoData();
}

const inRange = (start: string, end: string) => (x: { logged_at: string }) => x.logged_at >= start && x.logged_at < end;
const byTime = (a: { logged_at: string }, b: { logged_at: string }) => a.logged_at.localeCompare(b.logged_at);

/** In-memory repository used when Supabase isn't configured. Single demo user. */
export class MemoryRepo implements Repo {
  readonly mode = "demo" as const;

  async userEmail() {
    return "demo@nhip.local";
  }

  async getProfile() {
    return store().profile;
  }

  async saveProfile(input: ProfileInput): Promise<Profile> {
    const s = store();
    const now = new Date().toISOString();
    s.profile = { ...(s.profile ?? { id: "demo-profile", user_id: DEMO_USER_ID, created_at: now }), ...input, updated_at: now } as Profile;
    return s.profile;
  }

  async getLogs(start: string, end: string): Promise<LogBundle> {
    const { logs } = store();
    const f = inRange(start, end);
    return {
      food: logs.food.filter(f).sort(byTime),
      exercise: logs.exercise.filter(f).sort(byTime),
      water: logs.water.filter(f).sort(byTime),
      weight: logs.weight.filter(f).sort(byTime),
      sleep: logs.sleep.filter(f).sort(byTime),
      steps: logs.steps.filter(f).sort(byTime),
      notes: logs.notes.filter(f).sort(byTime),
    };
  }

  async firstWeight(): Promise<WeightLog | null> {
    const w = [...store().logs.weight].sort(byTime);
    return w[0] ?? null;
  }

  async addMeal(meal_type: MealType, logged_at: string, items: NewFoodItem[]) {
    const mealId = demoId();
    const now = new Date().toISOString();
    for (const i of items) {
      store().logs.food.push({ ...i, id: demoId(), user_id: DEMO_USER_ID, meal_id: mealId, meal_type, logged_at, created_at: now });
    }
  }

  async updateFood(id: string, patch: Partial<NewFoodItem> & { meal_type?: MealType }) {
    const f = store().logs.food.find((x) => x.id === id);
    if (f) Object.assign(f, patch);
  }
  async deleteFood(id: string) {
    const s = store();
    s.logs.food = s.logs.food.filter((x) => x.id !== id);
  }

  async addExercise(e: NewExercise) {
    store().logs.exercise.push({ ...e, id: demoId(), user_id: DEMO_USER_ID, created_at: new Date().toISOString() });
  }
  async deleteExercise(id: string) {
    const s = store();
    s.logs.exercise = s.logs.exercise.filter((x) => x.id !== id);
  }

  async addWater(amount_ml: number, logged_at: string) {
    store().logs.water.push({ id: demoId(), user_id: DEMO_USER_ID, amount_ml, logged_at });
  }
  async deleteWater(id: string) {
    const s = store();
    s.logs.water = s.logs.water.filter((x) => x.id !== id);
  }

  async addWeight(w: { weight_kg: number; body_fat_percentage: number | null; muscle_mass_kg: number | null; logged_at: string }) {
    store().logs.weight.push({ ...w, id: demoId(), user_id: DEMO_USER_ID });
  }
  async deleteWeight(id: string) {
    const s = store();
    s.logs.weight = s.logs.weight.filter((x) => x.id !== id);
  }

  async addSleep(x: { bedtime: string | null; wake_time: string | null; duration_minutes: number; quality: number | null; logged_at: string }) {
    store().logs.sleep.push({ ...x, id: demoId(), user_id: DEMO_USER_ID });
  }
  async deleteSleep(id: string) {
    const s = store();
    s.logs.sleep = s.logs.sleep.filter((x) => x.id !== id);
  }

  async addSteps(steps: number, logged_at: string) {
    store().logs.steps.push({ id: demoId(), user_id: DEMO_USER_ID, steps, logged_at });
  }
  async addNote(content: string, logged_at: string) {
    store().logs.notes.push({ id: demoId(), user_id: DEMO_USER_ID, content, logged_at });
  }
  async deleteNote(id: string) {
    const s = store();
    s.logs.notes = s.logs.notes.filter((x) => x.id !== id);
  }

  async listUserFoods() {
    return [...store().userFoods].sort((a, b) => b.times_logged - a.times_logged);
  }
  async rememberFood(f: { name: string; normalized_name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; unit: string }) {
    const s = store();
    const now = new Date().toISOString();
    const existing = s.userFoods.find((u) => u.normalized_name === f.normalized_name);
    if (existing) Object.assign(existing, f, { times_logged: existing.times_logged + 1, updated_at: now });
    else s.userFoods.push({ ...f, id: demoId(), user_id: DEMO_USER_ID, times_logged: 1, updated_at: now });
  }
  async deleteUserFood(id: string) {
    const s = store();
    s.userFoods = s.userFoods.filter((x) => x.id !== id);
  }
}
