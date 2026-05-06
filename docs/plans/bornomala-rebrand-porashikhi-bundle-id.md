# PoraShikhi Rebrand + Bundle ID — CTX-09 Step 0 Prep

**Created**: 2026-05-06
**Owner**: Bappy Golder
**Scope**: Rename app from Bornomala → PoraShikhi (publisher: oLab), pick + wire bundle ID and Android package, push live. Sets up CTX-09 Firebase work to start in a fresh chat.

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low–Medium
- Reason: Mechanical rename + config patches across 4 files. No architecture decisions.

---

## Context

CTX-09 (Firebase accounts) needs `app.json` to declare `ios.bundleIdentifier` and `android.package` before the iOS console / Apple Sign-In flow can be set up. Bappy also wants to consolidate naming under the **oLab company / PoraShikhi product** brand before this gets stamped into Firebase, the App Store, and Play Console — once a bundle ID ships it's effectively permanent.

Decisions locked by Bappy this turn:
- **Company**: oLab (not "Bappy Golder" personal name)
- **Product name**: PoraShikhi (not Bornomala)
- **Web home**: `olab.com.au`
- **Subdomain**: `porashikhi.olab.com.au`
- **iOS bundle ID** + **Android package**: derive from reverse-DNS of the company domain → `au.com.olab.porashikhi`
- **Expo slug**: `porashikhi`

Why `au.com.olab.porashikhi` (not `com.olab.porashikhi`):
- Reverse-DNS of `olab.com.au` is `au.com.olab` — that's the technically correct form when the company TLD is `.com.au`. Apple, Google, and Firebase all accept this.
- Keeps the namespace tied to the actual owned domain, leaving room for future oLab products under `au.com.olab.<product>`.

(If Bappy prefers the simpler `com.olab.porashikhi` form, we swap the constant in one place — flagged in Phase 5.)

---

## Outcome

After this plan executes:
- App identity is `PoraShikhi` by `oLab` everywhere visible (app name, slug, footer, logs, storage keys).
- `app.json` declares `ios.bundleIdentifier` + `android.package` — CTX-09 unblocked.
- `package.json` and `package-lock.json` name field = `porashikhi`.
- All `bornomala.*` AsyncStorage keys migrated to `porashikhi.*` (with one-time migration so existing testers don't lose progress).
- Repo committed + pushed to remote `main`.
- Bappy can open a fresh Opus 4.6 chat and run CTX-09 Step 1 (create Firebase project) without further prep.

---

## Files to Modify

| Path | Change |
|---|---|
| [app.json](../../app.json) | Rename `name`/`slug`, add `ios.bundleIdentifier`, `android.package`, `scheme` |
| [package.json](../../package.json) | Rename `name` field |
| [package-lock.json](../../package-lock.json) | Rename `name` fields (root + lockfile metadata) |
| [App.tsx](../../App.tsx) | Update storage keys (with migration), log prefixes, footer attribution |
| [README.md](../../README.md) | Update product name + repo references (if any) |
| `docs/decisions/` (new) | Record bundle-ID + rebrand decision |

No code in `lib/`, `data/`, etc. references the old name (verified via grep — only `App.tsx` + manifests).

---

## Implementation Phases

### Phase 1 — Decision Record (5 min)

Create `docs/decisions/bornomala-rebrand-to-porashikhi.md` capturing:
- Old name → new name
- Chosen bundle ID (`au.com.olab.porashikhi`) and rationale
- Storage-key migration approach
- Domain decisions (`olab.com.au`, `porashikhi.olab.com.au`)
- Date + commit reference (filled after commit)

This freezes the decision so future agents don't re-litigate it.

### Phase 2 — `app.json` patch

Apply these changes:

```jsonc
{
  "expo": {
    "name": "PoraShikhi",                          // was "Bornomala"
    "slug": "porashikhi",                          // was "bornomala"
    "scheme": "porashikhi",                        // NEW — needed for Firebase Auth deep links + Apple Sign-In later
    "ios": {
      "supportsTablet": true,
      "buildNumber": "2",
      "bundleIdentifier": "au.com.olab.porashikhi" // NEW
    },
    "android": {
      "adaptiveIcon": { /* unchanged */ },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "versionCode": 2,
      "package": "au.com.olab.porashikhi"          // NEW
    }
  }
}
```

Leave `version`, `extra.lastUpdated`, splash, and icon paths untouched. Do **not** bump version here — rebrand isn't a feature/fix release; the next real change ships under v1.1.4.

### Phase 3 — `package.json` + `package-lock.json` rename

`package.json`:
```json
"name": "porashikhi"
```

`package-lock.json`:
- Top-level `name`
- `packages.""` → `name`

(Both fields tracked by npm as the workspace identity. Out-of-sync names cause `npm install` warnings.)

### Phase 4 — `App.tsx` updates

Three categories of edits:

**4a. Storage key constants** ([App.tsx:52-53](../../App.tsx#L52)):
```ts
const STORAGE_KEY = 'porashikhi.progress.v1';
const LAST_TAB_STORAGE_KEY = 'porashikhi.lastTab.v1';

// New legacy constants for one-time migration
const LEGACY_STORAGE_KEY = 'bornomala.progress.v1';
const LEGACY_LAST_TAB_STORAGE_KEY = 'bornomala.lastTab.v1';
```

**4b. One-time migration on hydrate** (in the existing load effect — same place that currently parses `STORAGE_KEY`):
- On load: if new key is empty AND legacy key exists → copy legacy value to new key, delete legacy key, log `[porashikhi] migrated progress from bornomala.* keys`.
- This protects in-flight testers (Bappy's own device on v1.1.3) from losing streak/mastery data.

**4c. Log prefixes + footer copy**:
- [App.tsx:490](../../App.tsx#L490) — `[bornomala]` → `[porashikhi]`
- [App.tsx:885](../../App.tsx#L885) — `[bornomala]` → `[porashikhi]`
- [App.tsx:1471](../../App.tsx#L1471) — Replace "Bappy Golder" with **"an oLab product"** (locked). Read the surrounding `<Text>` block first to make sure the styling/grouping still reads naturally; adjust the parent line ("by …") wording if the result is awkward.
- [App.tsx:1478-1481](../../App.tsx#L1478) — `oLab` link unchanged (already points to `olab.com.au`).

### Phase 5 — Verification + commit + push

1. `npm install` — refreshes lockfile if any drift, confirms no warnings.
2. `npm run typecheck` — must pass.
3. `npm run web` — start dev server, smoke-test:
   - App title in browser tab = "PoraShikhi"
   - Footer reads correctly
   - Stored progress from previous session still loads (migration works)
4. Commit: `chore(rebrand): Bornomala → PoraShikhi, add bundle ID au.com.olab.porashikhi`
5. Push to `main`.

### Phase 6 — Handoff to fresh CTX-09 chat

Bappy opens a new Opus 4.6 chat and starts at **Step 1 (Create Firebase project)** of the gotcha walkthrough. The bundle ID `au.com.olab.porashikhi` is now available to paste anywhere Firebase asks.

---

## Verification Checklist

After Phase 5 commit, confirm:

- [ ] `cat app.json | grep -E "name|slug|bundleIdentifier|package"` shows new values
- [ ] `npm run typecheck` exits 0
- [ ] Browser tab title (web build) shows "PoraShikhi"
- [ ] Footer renders "powered by oLab" with version stamp intact
- [ ] AsyncStorage key migration verified manually: clear browser, set old `bornomala.progress.v1` via devtools, reload — new key populated, old key removed
- [ ] `git push` succeeded; remote `main` ahead of last commit
- [ ] No `bornomala` references remain except the migration constants and the decision record

```bash
grep -rn -i "bornomala" --include="*.ts" --include="*.tsx" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git . \
  | grep -v "LEGACY_\|migration"
```
Expected output: only the decision file and the legacy-migration constants in `App.tsx`.

---

## Decisions (locked 2026-05-06)

1. **Bundle ID** → `au.com.olab.porashikhi` (reverse-DNS form matches `olab.com.au`)
2. **Footer credit** → replace "by Bappy Golder" line with **"an oLab product"** (company attribution; personal name removed from user-facing footer)
3. **Version** → stay at **v1.1.3**. Next real change ships as v1.1.4. Rebrand commit does NOT bump version.

---

## Out of Scope

- Firebase project creation (CTX-09 Step 1+)
- `.env.local` Firebase secrets (CTX-09 Step 6)
- Apple Developer / Apple Sign-In setup
- Native iOS/Android app registrations in Firebase
- App icon / splash redesign for the rebrand (assets keep old visuals; Bappy can refresh later — flagged in `docs/inbox/discuss/`)
- DNS / hosting setup for `porashikhi.olab.com.au` (CTX-13 deployment concern)

---

## Critical Files (for execution agent)

- [/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/app.json](../../app.json)
- [/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/package.json](../../package.json)
- [/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/package-lock.json](../../package-lock.json)
- [/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training/App.tsx](../../App.tsx) — lines 52, 53, 490, 885, 1471, 1478

---

## Notes

- The plan-mode random stub at `~/.claude/plans/take-a-look-at-reactive-wirth.md` was never written — this is the canonical plan path.
- After this lands, update [CLAUDE.md](../../CLAUDE.md), [GEMINI.md](../../GEMINI.md), [AGENTS.md](../../AGENTS.md) to swap "Bornomala" for "PoraShikhi" in the project description (small follow-up — adds 5 min; will roll into the same commit).
- Project folder name (`04_bornomala-bangla-alphabet-training/`) stays as-is — renaming the directory breaks `~/.claude/projects/...` memory paths and adds zero value. Future projects can use the new naming convention.
