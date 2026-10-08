/**
 * Runs the real Supabase migration against an in-process Postgres (PGlite)
 * and checks that Row Level Security isolates users from each other.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { PGlite } from "@electric-sql/pglite";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
let db: PGlite;

/** Run statements as an authenticated Supabase user (role + JWT subject). */
async function as<T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${user}'; set role authenticated;`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-in for Supabase's auth schema.
  await db.exec(`
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  await db.exec(readFileSync(path.join(__dirname, "../supabase/migrations/0001_init.sql"), "utf8"));
  await db.exec(`
    grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;
  `);

  await as(A, `insert into profiles (name, age, sex, height_cm, weight_kg, activity_level, goal, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target)
                values ('A', 30, 'male', 175, 74, 'moderate', 'lose_weight', 2200, 150, 263, 61)`);
  await as(A, `insert into meals (meal_type) values ('lunch')`);
  const [meal] = await as<{ id: string }>(A, `select id from meals`);
  await as(A, `insert into food_logs (meal_id, meal_type, food_name, calories) values ($1, 'lunch', 'Phở bò', 480)`, [meal.id]);
  await as(A, `insert into water_logs (amount_ml) values (500)`);
  await as(A, `insert into weight_logs (weight_kg) values (74)`);
  await as(B, `insert into food_logs (meal_type, food_name, calories) values ('dinner', 'Cơm tấm', 750)`);
});

describe("row level security", () => {
  it("defaults user_id to the signed-in user", async () => {
    const rows = await as<{ user_id: string }>(A, `select user_id from food_logs`);
    expect(rows).toEqual([{ user_id: A }]);
  });

  it("hides other users' rows on every table", async () => {
    for (const t of ["profiles", "meals", "food_logs", "water_logs", "weight_logs"]) {
      const rows = await as(B, `select * from ${t} where user_id = $1`, [A]);
      expect(rows, t).toHaveLength(0);
    }
    const mine = await as<{ food_name: string }>(B, `select food_name from food_logs`);
    expect(mine.map((r) => r.food_name)).toEqual(["Cơm tấm"]);
  });

  it("rejects inserting rows for someone else (client-supplied user_id)", async () => {
    await expect(as(B, `insert into water_logs (user_id, amount_ml) values ($1, 250)`, [A])).rejects.toThrow(/row-level security/);
  });

  it("cannot update or delete another user's rows", async () => {
    await as(B, `update food_logs set calories = 1 where user_id = $1`, [A]);
    await as(B, `delete from water_logs where user_id = $1`, [A]);
    const [food] = await as<{ calories: string }>(A, `select calories from food_logs`);
    expect(Number(food.calories)).toBe(480);
    expect(await as(A, `select * from water_logs`)).toHaveLength(1);
  });

  it("cannot reassign own rows to another user", async () => {
    await expect(as(A, `update weight_logs set user_id = $1`, [B])).rejects.toThrow(/row-level security/);
  });

  it("cannot attach food to another user's meal", async () => {
    const [meal] = await as<{ id: string }>(A, `select id from meals`);
    await expect(as(B, `insert into food_logs (meal_id, meal_type, food_name, calories) values ($1, 'lunch', 'x', 1)`, [meal.id])).rejects.toThrow();
  });

  it("anonymous requests see nothing", async () => {
    await db.exec(`reset role; set request.jwt.claim.sub = ''; set role authenticated;`);
    const rows = (await db.query(`select * from food_logs`)).rows;
    await db.exec("reset role;");
    expect(rows).toHaveLength(0);
  });
});
