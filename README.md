# LIFE OS 365 — Fresh Install

Cloud-synced personal OS (tasks, habits, daily close, fitness, finance, investments, analytics).

**Stack:** Next.js 14 · Supabase Auth · PostgreSQL · RLS · Vercel

---

## Quick start (15 minutes)

### 1. Supabase SQL (once)

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) → your project  
2. **SQL Editor** → New query  
3. Paste **entire** contents of `supabase/migrations/001_init.sql`  
4. **Run**  
5. Confirm tables in **Table Editor**

### 2. Auth settings

**Authentication → Providers** → enable **Email**

**Authentication → URL configuration**

| Field | Local | Production |
|-------|--------|------------|
| Site URL | `http://localhost:3000` | `https://YOUR.vercel.app` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://YOUR.vercel.app/auth/callback` |

### 3. API keys

**Project Settings → API**

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. Run locally

```bash
cp .env.example .env.local
# edit .env.local with URL + anon key

npm install
npm run dev
```

Open http://localhost:3000 → **Sign up** → use the app.

### 5. Deploy to Vercel

```bash
git init
git add .
git commit -m "LIFE OS 365"
git branch -M main
git remote add origin https://github.com/YOUR_USER/life-os-365.git
git push -u origin main
```

1. [vercel.com](https://vercel.com) → Import repo  
2. Env vars:

```text
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

3. Deploy  
4. Add production URL to Supabase redirect list  
5. Open live URL worldwide  

### 6. Cross-device test

Same email on phone + laptop → same tasks and daily data.

---

## Features in this build

- Email / Google (if enabled) auth  
- Tasks, habits, hourly log, daily close  
- Goals, workouts, expenses, investment holdings  
- Analytics charts from **submitted** data only  
- Row Level Security (your data only)  
- Starts at zero — no fake metrics  

## Program dates

Default: **06 Oct 2026 → 05 Oct 2027** (stored on profile, changeable in DB).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| relation does not exist | Re-run `001_init.sql` |
| Invalid API key | Use **anon** key, not service_role |
| Redirect error on login | Add exact callback URL in Supabase Auth |
| Empty after signup | Check trigger created profile; RLS policies exist |
