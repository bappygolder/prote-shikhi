# Bornomala — Versioning Automation + Dev OS Confirmation

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Mechanical script + small App.tsx wiring change. No architecture decisions.

---

## Context

User asked two things in one breath:

1. **Is Dev OS wired up on this project?** → **Yes, it already is.** `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` all exist at project root and consistently reference `~/.claude/shared/`. `docs/{plans,prompts,decisions,inbox}/` are all populated. `temp/` is gitignored. **No work needed here.**

2. **Is versioning automatic, with visible UI confirmation?** → **Partially.** The version IS visible in the app footer (`App.tsx:1482` renders `APP_VERSION` = `v1.1.2`), so the user can already eyeball whether a build is current. But the **bump itself is manual and inconsistent**:
   - `App.tsx:55` says `v1.1.2` ✅
   - `package.json` `version` still says `1.0.0` ❌
   - `app.json` `version` still says `1.0.0` ❌
   - No `ios.buildNumber`, no `android.versionCode` (will block App Store / Play Store later)
   - `App.tsx:56` `LAST_UPDATED` is a hand-typed date string
   - No bump script, no git hook, no CI

So the user can SEE the version, but only because someone (Claude, in past sessions) remembered to edit `App.tsx`. Two of three version sources are out of sync. That's a footgun.

**Outcome of this plan**: one command (`npm run bump <patch|minor|major|x.y.z>`) updates every version source in lockstep. App.tsx reads from a single source via `expo-constants`, so the footer can never lie about which build is running.

---

## Approach

**Single source of truth = `app.json`.** Everything else either reads from it or is updated by the bump script.

### 1. App.tsx reads version from Expo Constants (instead of hardcoded string)

Replace [`App.tsx:55-56`](../../App.tsx#L55-L56):

```ts
// before
const APP_VERSION = 'v1.1.2';
const LAST_UPDATED = 'Wednesday, 6 May 2026';

// after
import Constants from 'expo-constants';
const APP_VERSION = `v${Constants.expoConfig?.version ?? '0.0.0'}`;
const LAST_UPDATED = Constants.expoConfig?.extra?.lastUpdated ?? '—';
```

`expo-constants` is already a transitive Expo dep — no new package needed. Verify with `node -e "require('expo-constants')"` before relying on it; if missing, `npx expo install expo-constants`.

### 2. New script: `scripts/bump-version.js`

Takes one arg (`patch`, `minor`, `major`, or explicit `x.y.z`). Updates:

- `package.json` → `version`
- `app.json` → `expo.version`, `expo.ios.buildNumber` (string, increment), `expo.android.versionCode` (int, increment), `expo.extra.lastUpdated` (today's date in `Wednesday, 6 May 2026` format)

No external semver library — short hand-rolled bump (project has no current dep on `semver`). Reuse Node's built-in `fs`/`path` only.

### 3. Wire script into `package.json`

```json
"scripts": {
  "bump:patch": "node scripts/bump-version.js patch",
  "bump:minor": "node scripts/bump-version.js minor",
  "bump:major": "node scripts/bump-version.js major",
  "bump":       "node scripts/bump-version.js"
}
```

Usage: `npm run bump:patch` → 1.1.2 → 1.1.3 everywhere. Or `npm run bump 1.2.0` for explicit.

### 4. One-time backfill

Run `npm run bump 1.1.2` once after the script lands so `package.json` (1.0.0) and `app.json` (1.0.0) catch up to the App.tsx-displayed version, and so iOS/Android build numbers get initialized to 1.

### 5. Document in README (one short section)

Tiny "Releasing" block: "Run `npm run bump:patch`, commit, push, build. The footer in the app will show the new version — that's how you confirm it shipped."

---

## Out of scope (deliberately)

- **No Husky / pre-commit auto-bump.** Forcing a bump on every commit is noise for WIP commits. Keep it explicit — the user pushes the button.
- **No GitHub Actions.** No CI exists yet on this repo; not worth standing up just for versioning.
- **No conventional-commits parsing.** Overkill for a solo project; the `:patch | :minor | :major` aliases are simpler.
- **No changelog generation.** Can be added later if releases get heavier.

---

## Critical files

| File | Change |
|---|---|
| [`App.tsx`](../../App.tsx#L55-L56) | Replace hardcoded `APP_VERSION` / `LAST_UPDATED` with `Constants.expoConfig` reads |
| [`app.json`](../../app.json) | Add `ios.buildNumber: "1"`, `android.versionCode: 1`, `extra.lastUpdated: "..."`. Sync `version` to `1.1.2` |
| [`package.json`](../../package.json) | Sync `version` to `1.1.2`. Add four `bump*` scripts |
| `scripts/bump-version.js` | **NEW** — the bumper |
| `README.md` | Add a short "Releasing" section |

---

## Verification

End-to-end test:

1. **Backfill works**: `npm run bump 1.1.2` → `package.json`, `app.json` show `1.1.2`; `app.json` shows `ios.buildNumber: "1"`, `android.versionCode: 1`, today's date in `extra.lastUpdated`.
2. **Footer reads correctly**: `npx expo start`, open the app on simulator/device, scroll to footer → see `v1.1.2` and today's date. Tap the ⓘ tooltip → same values.
3. **Bump cycles**: `npm run bump:patch` → footer shows `v1.1.3`, `ios.buildNumber: "2"`, `android.versionCode: 2`. Reload app — footer updates.
4. **Explicit bump**: `npm run bump 2.0.0` → all three files show `2.0.0`.
5. **Bad input rejected**: `npm run bump foo` → script exits non-zero with a clear error, no files touched.
6. **No console errors**: `tsc --noEmit` passes (or whatever the project's typecheck command is — `npm run typecheck` if present).

If step 2 shows a stale version, the wiring is wrong — likely `expo-constants` not bundled or `extra` field not propagated. Fix before declaring done.

---

## Decisions (confirmed by user)

1. **Date format**: keep long form (`Wednesday, 6 May 2026`). Bump script will format with `toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })`.
2. **Auto-commit**: yes. Script ends with `git add package.json app.json` + `git commit -m "chore(version): bump app version to vX.Y.Z (YYYY-MM-DD)"`. Matches existing commit style ([`ec169bb`](https://github.com/) — `chore(version): bump app version to v1.1.2 (2026-05-06)`). Script must error out cleanly if working tree has unrelated unstaged changes (don't sweep them in).
3. **Build numbers**: auto-increment iOS `buildNumber` and Android `versionCode` on every bump (patch/minor/major alike).

---

## File location note

Plan auto-created at `~/.claude/plans/are-we-using-dev-delightful-quokka.md`. Per `CLAUDE.md` rule #9 (project-specific plans live in the project, not framework), the real plan is **here**: `docs/plans/bornomala-build-versioning-automation.md`. Stub at `~/.claude/plans/...` will be deleted after exit plan mode (cannot delete inside plan mode — non-readonly action).
