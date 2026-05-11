# CTX-10 — Letter Stats Drill-down

> **Rename this file on execution** to:
> `docs/plans/bornomala-ctx10-letter-stats-drilldown.md`
> (project-scoped per CONTENT-ROUTING.md; slug = `bornomala`)

---

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Bounded scope — schema extension + one new modal + tap-handler swap; no new files or routes

---

## Context

CTX-10 is the next item in the Wave 2 queue (UX-04 ✅ → **CTX-10** → CTX-11 → ...). It adds a stats modal when a user taps a letter tile on the Okkhor screen, replacing the direct-to-practice navigation. Long-press (reset) is unchanged. The modal surfaces `LetterProgress` data already collected by the v2 algorithm — the only schema addition is `dayHistory: string[]` to count distinct practice days.

---

## Critical files

| File | Change |
|---|---|
| `lib/learning.ts` | Schema v2 → v3: add `dayHistory`, update migration + `applyGrade` |
| `App.tsx` | New `statsModalCard` state, stats modal JSX, swap tile `onPress` |

No new files needed. Modal lives inline in `App.tsx`.

---

## Implementation plan

### Step 1 — Schema extension (`lib/learning.ts`)

1. Add `dayHistory: string[]` to `LetterProgress` type (after `firstSeenAt`).
2. Bump schema constant to `schemaVersion: 3`.
3. In `migrateProgress()`: add v2→v3 path — append `dayHistory: []` to any progress object missing it.
4. In `initialProgress` factory function: include `dayHistory: []`.
5. In `applyGrade()` (or equivalent mutation): after recording a grade, push today's ISO date string (`new Date().toISOString().slice(0, 10)`) to `dayHistory` if that date is not already the last entry. Do NOT use `Set` — just check the last element (cards are graded in chronological order so consecutive same-day calls are deduped cheaply).

### Step 2 — Stats modal state (`App.tsx`)

Add near other modal state variables:
```ts
const [statsModalCard, setStatsModalCard] = useState<LetterCard | null>(null);
```

### Step 3 — Swap tile tap handler (`App.tsx`, line ~1287)

Change:
```ts
onPress={() => handleChooseLetter(card)}
```
To:
```ts
onPress={() => setStatsModalCard(card)}
```
Long-press (`handleResetLetter`) unchanged.

### Step 4 — Stats modal JSX (`App.tsx`)

Add a `<Modal>` (React Native core) rendered at the bottom of the JSX tree, visible when `statsModalCard !== null`.

**Data to show** (from `letterProgress[statsModalCard.id]` or `initialProgress` if null):
| Label | Source field |
|---|---|
| অক্ষর (letter) | `statsModalCard.letter` |
| মোট চেষ্টা (attempts) | `progress.seenCount` |
| সঠিক (correct) | `progress.correctCount` |
| ভুল (wrong) | `progress.wrongCount` |
| সেরা ধারা (best streak) | `progress.bestStreak` |
| প্রথম দেখা (first seen) | `progress.firstSeenAt` — format as `DD/MM/YYYY` or "এখনো দেখা হয়নি" |
| শেষ দেখা (last seen) | `progress.lastSeenAt` — same format |
| দিন চর্চা (days practised) | `new Set(progress.dayHistory).size` |
| শেখা হয়েছে? (mastered) | `progress.mastered` → "হ্যাঁ ✓" or "না" |

**Modal actions:**
- "এখন চর্চা করো" (primary button) → calls `handleChooseLetter(statsModalCard)` then `setStatsModalCard(null)`
- "বন্ধ করো" (secondary / X icon) → `setStatsModalCard(null)`
- Backdrop `Pressable` → `setStatsModalCard(null)`

**Styles**: reuse existing theme tokens (`c.surface`, `c.text`, `c.accent`). Add minimal new styles: `statsModal`, `statsModalRow`, `statsModalLabel`, `statsModalValue` — use `lib/theme.tsx` pattern (add under the heatmap styles added in CTX-08).

### Step 5 — Verification

```bash
# Type check
npx tsc --noEmit

# Algorithm tests (must still all pass)
npx tsx --test lib/learning.test.ts

# Build
npm run build:web && npm run serve:web
```

Manual test:
1. Tap a letter tile → modal opens with correct stats
2. Tap "এখন চর্চা করো" → goes to practice for that letter, modal closes
3. Tap backdrop → modal closes, no navigation
4. Long-press → reset dialog still fires (no regression)
5. Fresh card (never seen) → modal shows zeros and "এখনো দেখা হয়নি"
6. Grade a card → modal on next open shows incremented counts + today's date in dayHistory

---

## Reuse notes

- `initialProgress` factory: already exists in `lib/learning.ts` — extend it, don't duplicate.
- Migration pattern: follow the existing v1→v2 shape in `migrateProgress()`.
- Modal backdrop pattern: look for any existing `Modal` usage in `App.tsx` for the dismiss pattern before writing from scratch.
- `toBanglaNumber()`: already imported — use for numeric display in the modal.
- Theme styles: add to `lib/theme.tsx` alongside the `heatmapToggle*` block added in CTX-08.

---

## Out of scope (defer)

- Unit test for "days practised" counter — roadmap mentions this but it's a nice-to-have; add to inbox if time allows
- Cross-day mock date test — same
- "Active-letter highlight inside modal" (letterTileActive style in the grid stays as-is)
