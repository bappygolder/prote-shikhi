# CTX-08 — UI Quick-Wins Party

**Status**: ⏳ Pending
**Created**: 2026-05-06
**Roadmap link**: `docs/plans/bornomala-roadmap-may2026-improvements.md` → row 1 + per-prompt scope
**Touches**: `App.tsx` only (no library changes, no schema changes)
**Risk**: Low
**Parallel-safe with**: CTX-09 (different files), DIAG-01 (different files)
**$ value**: 3500
**Urgency**: 4
**Score**: 7

## What this context window does

Batch of small, low-risk visual cleanups in the existing app, all in `App.tsx`. Target: recover vertical space, simplify the Okkhor chip row, make the heatmap toggleable, and swap the path tab icon. Each change is independently revertable.

## Working directory

`/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training`

## Worktree

Run on `main` directly OR on `feat/ctx-08-ui-quickwins`. CTX-09 is on its own worktree so no `App.tsx` conflicts mid-session, but coordinate the merge order: **CTX-08 lands first**, then CTX-09's single menu add merges on top.

## Recommended model

Sonnet 4.6 (`claude-sonnet-4-6`) — bounded UI work in a known file.

---

## Prompt to paste

```markdown
## Before starting

git pull origin main --rebase

**Read these files first:**
- `App.tsx` (entire file — this is monolithic, you need the whole layout)
- `data/banglaLetters.ts` (verify the order of cards for pair-grouping check)
- `docs/plans/bornomala-roadmap-may2026-improvements.md` → CTX-08 section (the spec)

---

## Checklist (every item independently testable)

### 1. Hide global brand title on every screen except home
At ~line 1002 the "পড়তে শিখি" header renders unconditionally. Tab labels at the bottom already convey identity. Remove the header from Path, Okkhor, and Practice screens. Keep it ONLY on the home/landing if that pattern exists; otherwise remove entirely.

### 2. Collapse Okkhor header to one row
Lines ~1139–1151 render `অক্ষর`, `০/৬ শেখা`, and a right-side count badge as a stacked block. Collapse to a single row: `অক্ষর · ০/৬ শেখা · স্বর ১`. Use `·` as separator. Push the right-side badge into the row OR remove if redundant with the inline count.

### 3. Remove the "Letter 6" badge if redundant
After step 2, the right-side total badge may be duplicated by the inline `০/৬`. Remove it.

### 4. Simplify the Okkhor chip row
Lines ~1154–1192 render four chips: `খোলা`, `সব`, `চর্চা`, `শেখা`. Reduce to **two**: `খোলা` (default, active filter) and `সব`. Remove `চর্চা` and `শেখা` — these duplicate state colour cues already present on each card.

Add a small helper line below the chip row when `খোলা` is selected: `এই অক্ষরগুলো এখন শেখা হচ্ছে` (these letters are currently being learned).

### 5. Path screen: heatmap NOT sticky + add toggle
Confirm `UniverseHeatmap` (lines ~315-341 + ~1009-1028) is NOT in a sticky container. If it is, un-sticky it.

Add a small eye-toggle in the path screen header to hide/show the heatmap. Persist state in AsyncStorage under key `porashikhi.ui.heatmap.visible.v1`. Default visible.

### 6. Verify pair grouping in Okkhor grid
The Okkhor 3-column grid should render visually adjacent: ই / ঈ next to each other, and উ / ঊ next to each other. Check `data/banglaLetters.ts` card order. If row 2 starts with ঈ (so row 1 ends with ই), that's correct. If not, reorder the cards array so pairs are in the same row OR adjacent rows of the same column.

### 7. Swap path tab icon
Line ~1255 hardcodes `⇡`. Change to `〰` (sideways path glyph) as a placeholder. Add a TODO comment: `// TODO: replace with SVG/Lottie when Bappy supplies asset`.

### 8. Reduce top spacing on the Practice (Shiki) screen header
The current padding above the active card is generous. Trim to recover ~20-30px of vertical space. Check on web, iOS, and Android dimensions.

---

## Verification (run before declaring done)

1. `npm run typecheck` — passes.
2. `npm test` — all 31 algorithm tests still pass (no algorithm changes in this CTX).
3. `npm run web` — load on web, walk through all three screens:
   - **Path:** no global title; heatmap visible by default; eye-toggle hides it; reload preserves toggle state.
   - **Okkhor:** header is one row `অক্ষর · X/Y শেখা · স্বর ১`; only `খোলা` and `সব` chips; `খোলা` shows the helper line; ই/ঈ and উ/ঊ visually adjacent.
   - **Practice (Shiki):** no global title; less top padding.
   - **Tab bar:** path icon is `〰` not `⇡`.
4. Reload page → all toggles + filter selections persist where intended.

## Out of scope

- Rebrand to PoraShikhi (UX-04)
- Top progress bar percentage redesign (UX-04)
- Letter card tap → stats modal (CTX-10)
- Menu cleanup (saving for a sibling CTX after CTX-09 lands its profile menu item)
- Anything in `lib/firebase/`, `lib/learning.ts`, or new screens

## Stop conditions

- If the brand title is referenced from more than `App.tsx`, stop and ask before grepping for occurrences elsewhere.
- If pair grouping requires re-ordering the cards array AND that array is consumed by the algorithm in a way that changes outcomes, stop and ask.

---

## Handoff

When complete, update status to ✅ and append:
- Branch + commit hash
- Screenshots before/after for at least Okkhor + Path
- Any visual regressions observed (file as inbox items)
- Confirm all tests pass
```
