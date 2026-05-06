# Rebrand: Bornomala → PoraShikhi (oLab)

**Date**: 2026-05-06
**Status**: Active
**Owner**: Bappy Golder
**Trigger**: Pre-CTX-09 (Firebase) prep — bundle ID about to be stamped permanently into Firebase / App Store / Play Console, so consolidate naming first.

---

## Decisions

| Item | Old | New |
|---|---|---|
| App display name | Bornomala | **PoraShikhi** |
| Expo slug | `bornomala` | `porashikhi` |
| Expo URL scheme | (none) | `porashikhi` |
| iOS bundle identifier | (unset) | **`au.com.olab.porashikhi`** |
| Android package | (unset) | **`au.com.olab.porashikhi`** |
| npm package name | `bornomala` | `porashikhi` |
| AsyncStorage key prefix | `bornomala.*` | `porashikhi.*` (with one-time migration) |
| Log prefix | `[bornomala]` | `[porashikhi]` |
| Footer credit | "by Bappy Golder" | **"an oLab product"** |
| Version | v1.1.3 | v1.1.3 (unchanged — rebrand isn't a feature/fix) |

## Naming context (locked)

- **Company**: oLab (Australian, public website `olab.com.au`)
- **Product**: PoraShikhi (Bangla adult literacy app)
- **Production URL**: `porashikhi.olab.com.au` (DNS / hosting setup is CTX-13 scope, not this commit)

## Why `au.com.olab.porashikhi` (not `com.olab.porashikhi`)

Reverse-DNS of `olab.com.au` is `au.com.olab` — the technically correct form for `.com.au` domains. Apple, Google, and Firebase all accept it. Keeps the namespace tied to the actually owned domain and leaves room for future oLab products under `au.com.olab.<product>` without collisions.

The simpler `com.olab.porashikhi` form was rejected because it implies ownership of `olab.com` (which is not held).

## Why version stays at v1.1.3

The version line tracks user-visible behavior changes — features, fixes, content. The rebrand changes identity but not behavior, so bumping would be misleading in the release notes. Next real change ships as v1.1.4.

## Storage migration

Existing testers (Bappy's own device on v1.1.3) have progress, mastery counters, and last-tab state under `bornomala.progress.v1` / `bornomala.lastTab.v1`. The new `App.tsx` reads new keys first; if empty, falls back to legacy keys, copies the value forward, and deletes the legacy key. Logged once per device. No data loss.

## Out of scope for this commit

The rebrand will surface in many other places over time. Tracking what still needs updating:

- [ ] Firebase project name (created in CTX-09)
- [ ] Apple Developer / App Store Connect listing (CTX-13)
- [ ] Google Play Console listing (CTX-13)
- [ ] DNS for `porashikhi.olab.com.au` (CTX-13)
- [ ] App icon / splash visual refresh (`assets/icon.png`, `assets/splash-icon.png`, `assets/adaptive-icon.png`, `assets/favicon.png`) — visuals stay Bornomala-era for now
- [ ] `CLAUDE.md` / `GEMINI.md` / `AGENTS.md` project description updates
- [ ] `docs/ARCHITECTURE.md`, `docs/SCHEMA.md`, `docs/ROADMAP.md` references
- [ ] `README.md` mentions
- [ ] `~/.claude/projects/...` memory paths reference `04_bornomala-bangla-alphabet-training/` — folder rename deferred indefinitely (would break memory continuity for zero gain)
- [ ] Future build prompts in `docs/prompts/` referencing "Bornomala"
- [ ] Helper-agent handoff doc (`docs/plans/bornomala-helper-agent-commit-handoff.md`) — stale name in filename, content unchanged

These are deferred to keep this commit small and focused. They surface naturally in subsequent CTX work and can be batched into a single "rebrand follow-up" commit later.

## Files changed in this commit

- `app.json` — name, slug, scheme, ios.bundleIdentifier, android.package
- `package.json` — name field
- `package-lock.json` — name fields (root + `packages.""`)
- `App.tsx` — storage key constants, hydrate-time migration, log prefixes, footer credit text
- `docs/decisions/active/2026-05-06-rebrand-bornomala-to-porashikhi.md` — this file
- `docs/plans/bornomala-rebrand-porashikhi-bundle-id.md` — execution plan (kept for reference)

## Linked

- Plan: `docs/plans/bornomala-rebrand-porashikhi-bundle-id.md`
- Next: CTX-09 Firebase setup (fresh chat, Opus 4.6) — bundle ID `au.com.olab.porashikhi` is now available to paste anywhere Firebase asks.
