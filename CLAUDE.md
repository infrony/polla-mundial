# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A full-stack World Cup 2026 prediction app ("Polla Mundial 2026") built with Next.js 14 App Router, NextAuth.js, and PostgreSQL (Neon). Users register, predict match results (1/X/2), and pick group qualifiers. An admin can enter real results and view all predictions.

## Commands

```powershell
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm start            # Production server
node scripts/init-db.js  # Create/reset all DB tables (run once)
```

## Architecture

**Stack:** Next.js 14 (App Router) · NextAuth v4 (JWT sessions) · PostgreSQL (Neon via `pg`) · Vanilla CSS

**Route structure:**
- `app/(app)/` — authenticated app pages (partidos, grupos, tabla, mis-picks); the `(app)/layout.js` enforces auth + renders header/nav
- `app/(auth)/` — login, register (no auth required)
- `app/admin/` — admin-only panel; `AdminPanel.js` is the client component

**Authentication:**
- Google OAuth (optional) — requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.env.local`
- Email + password via `CredentialsProvider`
- Register at `/api/auth/register` → hashes password with bcrypt → sets `is_admin=true` if email matches `ADMIN_EMAIL` env var
- JWT sessions: `session.user.id` is a string (DB integer serialized)

**Data flow:**
- `lib/data.js` — all 72 group-stage matches generated at module load + groups definition
- `lib/db.js` — `pg.Pool` singleton, exported `query(text, params)` helper
- `lib/auth.js` — NextAuth `authOptions` (imported by API route + server components via `getServerSession`)

**Match picks** auto-save on each click (optimistic update → POST `/api/picks`). Group picks auto-save on each `<select>` change (POST `/api/group-picks`).

**Scoring:** 1pt per correct match result + 2pt for correct group 1st + 1pt for correct group 2nd. Computed live in SQL in `app/(app)/tabla/page.js` and `app/api/leaderboard/route.js`.

**Admin panel** (`/admin`) has three tabs:
1. Participants — user cards + full pick matrix (all users × all matches)
2. Match Results — enter 1/X/2 per match, triggers score recalculation
3. Group Results — enter group qualifiers

## Database Schema

Five tables: `users`, `picks`, `group_picks`, `match_results`, `group_results`. All FK'd to `users(id)` with `ON DELETE CASCADE`. Run `node scripts/init-db.js` to create them.

## Key Conventions

- `session.user.id` is a **string** — cast with `Number()` when comparing to DB integer IDs
- `NEXTAUTH_URL` in `.env.local` must match the actual running port for OAuth callbacks to work
- `ADMIN_EMAIL` env var controls which email gets admin on registration/first Google login
- Group match dates are speculative (not official FIFA schedule)
