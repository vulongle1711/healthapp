# Nhịp — AI health & fitness tracker

Log food, drinks, exercise, water, weight and sleep by just describing them —
in English or Vietnamese (“Ăn 1 tô phở bò, uống cà phê sữa đá”, “Chơi pickleball 1 tiếng rưỡi”).

Next.js 15 · TypeScript · Tailwind 4 · Supabase (Postgres + Auth + RLS) · Recharts · Zod · Claude API.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in what you have (all optional for a first look)
npm run dev                  # http://localhost:3000
```

| Variable | Needed for | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Accounts + saving data | **Demo mode**: one sample user, data kept in server memory (resets on restart) |
| `AI_API_KEY` (Anthropic) | AI estimates, photo scan, AI coach | Built-in offline estimator (≈60 common VN/international foods, 20 activities); photo scan disabled |
| `AI_MODEL` | Override model | `claude-sonnet-5-5` |
| `GEMINI_API_KEY` (Google, free tier) | Same AI features, used only when `AI_API_KEY` is empty | Offline estimator |
| `GEMINI_MODEL` | Override Gemini model | `gemini-3.5-flash` |

The AI key is only read on the server (route handlers under `app/api/ai/*`); it is never sent to the browser.

## Set up Supabase (≈5 minutes)

1. Create a project at <https://supabase.com/dashboard> (region: Singapore is closest to Vietnam).
2. **SQL Editor → New query** → paste all of `supabase/migrations/0001_init.sql` → **Run**.
   This creates the tables and Row Level Security so every user only sees their own rows.
3. **Project Settings → API**: copy *Project URL* and the *anon public* key into `.env.local`.
4. **Authentication → URL Configuration**: set Site URL to your app URL (e.g. `http://localhost:3000`)
   and add `http://localhost:3000/auth/callback` to Redirect URLs.
   (Optional: Authentication → Providers → Email → turn off "Confirm email" while testing.)
5. Restart `npm run dev` → you'll land on the sign-in page → create an account → onboarding.

## Scripts

```bash
npm test           # vitest: calculations, offline parser (EN/VI), AI fallbacks, RLS isolation (PGlite)
npm run typecheck
npm run lint
npm run build
```

## Structure

```
app/(app)/…        dashboard, log, nutrition, exercise, progress, insights, profile
app/api/ai/…       food (text + photo), exercise, day (universal log), insights, coach
app/actions.ts     server actions — all writes, Zod-validated, user id from the session only
lib/ai/            provider abstraction, prompts, Zod schemas, offline parser + food/MET tables
lib/calculations/  BMR (Mifflin–St Jeor), TDEE, targets, macros, day/period summaries
lib/data/          Repo interface → SupabaseRepo | MemoryRepo (demo) + seed data
supabase/migrations/0001_init.sql
```

## Notes on the numbers

- BMR: Mifflin–St Jeor. TDEE = BMR × activity multiplier (1.2–1.9).
- Targets: ~7,700 kcal per kg; deficit capped at 25% of TDEE; floor 1,500 (men) / 1,200 (women) kcal.
- Exercise: **active** calories = (MET − 1) × kg × hours, so resting burn isn't double-counted with BMR.
  A value from your watch always replaces the estimate.
- "Remaining" = target − food. Exercise is shown, not automatically eaten back.
- When you correct an AI estimate, it's saved to **My Foods** and reused next time (matched across EN/VI names).
- Everything is an estimate — ranges and assumptions are shown for every AI item.
