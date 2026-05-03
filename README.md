# Bornomala

> Mobile-first Bangla literacy trainer for adult learners.
> Bangla-only flashcards, teacher-assisted grading, fast practice loop.

The app currently uses the working name **Bornomala** in code (`package.json`, `app.json`).
A planned rename to **Porte Shikhi** is tracked in [`docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md`](docs/prompts/admin/ADMIN-01-rename-to-porte-shikhi.md).

---

## Stack

Expo React Native · TypeScript (strict) · React 19 · React Native 0.81 · AsyncStorage (local progress only).

## Run locally

```bash
npm install
npx expo start
```

Then press `i` for iOS Simulator, `a` for Android, or scan the QR with Expo Go.

```bash
npm run typecheck   # tsc --noEmit
```

## Deploy to Vercel

The production web export writes to `dist/`.

```bash
npm run build:web
npm run serve:web
```

Vercel should use:

| Setting | Value |
|---|---|
| Framework preset | Other |
| Build command | `npm run build:web` |
| Output directory | `dist` |
| Install command | `npm install` |

External steps:

1. Push this repo to GitHub.
2. In Vercel, import the GitHub repo as a new project.
3. Confirm the settings above, then deploy.
4. Add `porte-shikhi.olab.com.au` under Project Settings → Domains.
5. In the DNS provider for `olab.com.au`, add the CNAME record Vercel shows for `porte-shikhi`.
6. Wait for Vercel to verify the domain and provision HTTPS.
7. Open `https://porte-shikhi.olab.com.au` and confirm the trainer loads.

## Project layout

```
App.tsx              First flashcard trainer screen
data/                Letter sets and learning content
lib/                 Progress logic, scheduling, helpers
docs/                Product, architecture, plans, prompts
```

## Where to read next

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — tech stack and structure
- [`docs/PRODUCT-LOGIC.md`](docs/PRODUCT-LOGIC.md) — users, flow, MVP boundaries
- [`docs/LEARNING-LOGIC.md`](docs/LEARNING-LOGIC.md) — card model, mastery, scheduler
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — current phase and what's deferred
- [`docs/TASKS.md`](docs/TASKS.md) — open tasks across app, devops, content, learning

AI tool entry points: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` — kept in sync, all point at the shared collaboration framework.

## Status

Phase 1 — teacher-assisted flashcard MVP with local-only progress and no accounts.
