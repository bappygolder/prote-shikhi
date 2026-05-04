# Bornomala — Add শেখার পথ (Learning Path) tab

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: Single-file UI/state changes plus a small storage migration; no architectural risk, but nuanced layout work and several touchpoints in `App.tsx`.

---

## Context

Today the bottom nav has three tabs — **অক্ষর** (letters grid), **শিখি** (flashcard practice), **মেনু** (drawer with stats + presets). The 10 practice presets (স্বর ১, স্বর ২, কার চিহ্ন, ব্যঞ্জন ক/চ/ট/ত/প, শেষ ব্যঞ্জন, সংখ্যা) are buried inside the drawer, which makes the journey through the alphabet feel hidden and ungrounded.

The app needs a clear "learning path" surface — a Khan-Academy / Duolingo-inspired home for sequential progress — so adult learners see the full universe of letters, where they are in the journey, and can tap straight into the next step. More paths will be added later (e.g. words, sentences), so this tab also needs to scale to multiple journeys.

**Outcome:** A new leftmost tab called **শেখার পথ** that becomes the single source of truth for preset selection, combining a GitHub-style heatmap (universe of every letter, coloured by mastery) with a Duolingo-style winding vertical path of preset nodes. Soft gating: every preset stays tappable, but the current node is visually emphasized with a START button. Default tab on first launch stays **শিখি** (practice); subsequent launches restore the last visited *content* tab (never restore to মেনু).

---

## Final design

### Bottom nav (4 tabs, left → right)

```
[ পথ icon ] [ অ ] [ ▶ ] [ ☰ ]
শেখার পথ   অক্ষর   শিখি   মেনু
```

- New tab `path` is leftmost.
- Icon: a simple stacked-dots "path" glyph (e.g. `⋮` rotated, or three small filled circles `●○●` arranged as a winding hint). Use a text glyph to match the existing icon style — no new asset needed for v1.
- Two-word label `শেখার পথ` fits the existing 17pt label slot at ~95% width on smallest device; verify in browser. If cramped, fallback label is `পথ`.
- Tab type extends from `'practice' | 'letters'` to `'path' | 'letters' | 'practice' | 'menu-virtual'`. (Menu remains an overlay, not a tab; same as today.)

### `path` screen layout

Top → bottom inside the existing `shell` container:

1. **Header** (reuses existing `header` + `titleBlock`). `stageLabel` for the path tab is just `শেখার পথ`.

2. **Universe heatmap** — a compact, non-scrolling grid of every card across **all** presets (currently ~80 cells: vowels + vowel-signs + consonants + numbers).
   - One small square per letter, ~14pt size, tightly packed (8–10 columns).
   - Colour scale by mastery percent: white/cream (0%) → soft orange (in progress) → green (mastered). Reuse existing palette: `#ffffff`, `#fff7ed`, `#ecfdf3`.
   - Tap a square → jumps to that letter in **শিখি** (same behaviour as `handleChooseLetter`). Long-press could later show a tooltip; out of scope for v1.
   - Total height ~10–12% of viewport — keeps room for path below.

3. **Path** — vertical scrollable list of preset nodes connected by a winding line.
   - Each node is a circular badge (~64pt) showing:
     - Locked-looking (lower opacity, grey border) if user has 0 mastered cards in this preset AND at least one earlier preset still has unmastered cards.
     - "Started" (orange border, no tick) if some progress.
     - "Mastered" (green border, ✓ tick) if `isPresetComplete()` returns true.
     - "Current" (large, dark border + subtle pulse) on the **first non-mastered** preset in order.
   - Below each badge: preset label + small `<mastered>/<total>` count in Bangla numerals.
   - The current node also has a **শুরু** ("Start") pill button right under it that switches to **শিখি** with that preset selected (same handler logic as `handleSelectPreset`).
   - All nodes are tappable (soft gating). Tapping a non-current node also calls `handleSelectPreset` and switches to **শিখি**, but with no big START pill.
   - Connector line: zigzag using alternating left/right alignment (Duolingo style) implemented with simple `marginLeft` offsets — no SVG needed for v1.

4. **Bottom nav** below as today.

### Menu drawer (cleanup)

Remove the entire `প্রিসেট` collapsible from the menu. Resulting menu structure:

- Current preset/list status rows (kept).
- পরিসংখ্যান (Stats) collapsible (kept).
- আবার শুরু (Full reset) (kept).
- Footer (kept).

The `প্রিসেট` collapsible state (`isPresetExpanded`) and `handleResetPreset` move with the preset list — see "Per-preset reset" below.

### Per-preset reset (preserve existing capability)

The drawer currently exposes a small ↺ reset on each preset. Move this to the path:

- Long-press a preset node → show the existing `confirmDestructiveAction` dialog wired to `handleResetPreset` (Bangla copy unchanged).
- This preserves capability without adding a tiny ↺ icon to every node, which would clutter the path visually. Acceptable because per-preset reset is a power-user action.

### Default tab + last-tab persistence

- Add a new storage key `bornomala.lastTab.v1` storing one of `'path' | 'letters' | 'practice'` (never `menu`).
- On first launch (no value): default to `'practice'` (today's behaviour — confirmed).
- On subsequent launches: restore the saved value. If the saved value is missing or invalid, fall back to `'practice'`.
- Persist on every `setCurrentTab` call that targets one of the three content tabs. Opening **মেনু** does **not** update the saved tab (menu is an overlay, not a tab).

---

## Files to modify

- `App.tsx` — the entire change happens here. Bottom-nav additions, new `path` screen, menu cleanup, last-tab persistence.
- `lib/learning.ts` — **read only**. Reuse `getProgressForCard`, `isPresetComplete`, `getMasteryPercent` (in `App.tsx`), `resetCards`. No new exports needed.
- `data/banglaLetters.ts` — **read only**. Reuse `PRACTICE_PRESETS`, `ALL_CARDS` (or compose from existing exports). If `ALL_CARDS` does not exist as a single export, sum from `VOWEL_CARDS + VOWEL_SIGN_CARDS + CONSONANT_CARDS + NUMBER_CARDS` inline.

No new files. No new dependencies. No new assets.

---

## Implementation outline (concrete edits in `App.tsx`)

1. **Type widen.** Change `type AppTab = 'practice' | 'letters'` → `type AppTab = 'path' | 'letters' | 'practice'`.

2. **New constants.**
   - `LAST_TAB_STORAGE_KEY = 'bornomala.lastTab.v1'`.
   - `PATH_TAB_LABEL = 'শেখার পথ'`, `PATH_TAB_ICON = '◌'` (final glyph chosen during build).
   - `ALL_PATH_CARDS` — flat list of every card across presets, used by the heatmap. Compose from existing data exports.

3. **Persist last tab.**
   - Read `LAST_TAB_STORAGE_KEY` in the existing AsyncStorage init `useEffect`. If valid, `setCurrentTab(saved)`.
   - Add a `setCurrentTab` wrapper (or a `useEffect` keyed on `currentTab`) that writes to storage when the tab changes — debounced like the progress write.

4. **Render `path` screen** when `currentTab === 'path'`, replacing the existing ternary `currentTab === 'practice' ? … : …` with a switch on three values. Components inside:
   - `<UniverseHeatmap cards={ALL_PATH_CARDS} progress={progress} onTapCard={handleChooseLetter} />`
   - `<PresetPath presets={PRACTICE_PRESETS} progress={progress} onStart={handleSelectPreset} onResetLong={handleResetPreset} currentPresetId={firstNonMasteredPresetId} />`
   - These can be inline function components inside `App.tsx` (matches existing style of `ProgressBar`, `LetterProgressMark`).

5. **Compute `firstNonMasteredPresetId`:** the first `PRACTICE_PRESETS[i]` where `isPresetComplete(preset.cards, progress) === false`. If all are complete, treat the last as "current" with no START button (or a "🎉 সব শেষ" celebratory state).

6. **Bottom nav.** Insert the new `path` Pressable as the leftmost tab. Reuse the existing `bottomTab` / `bottomTabActive` styles.

7. **Menu drawer.** Delete:
   - The `collapsibleSection` block for প্রিসেট (lines ~1096–1177 today).
   - State `isPresetExpanded` and its `useState`.
   - The local `handleResetPreset` stays — it's now called from path long-press.
   - Keep `selectedPreset.label` in the existing `প্রিসেট` status row at the top of the menu (read-only display).

8. **Header `stageLabel`.** Add a branch for `currentTab === 'path'` → `'শেখার পথ'`. Practice and letters branches unchanged.

9. **Styling.** Add styles in the existing `StyleSheet.create({ … })`:
   - `pathScreen`, `universeGrid`, `universeCell`, `universeCellStarted`, `universeCellMastered`.
   - `pathScroll`, `pathColumn`, `pathNode`, `pathNodeLocked`, `pathNodeStarted`, `pathNodeMastered`, `pathNodeCurrent`, `pathNodeLeft`, `pathNodeRight`, `pathConnector`, `pathLabel`, `pathCount`, `startPill`, `startPillText`.

---

## YAGNI / explicitly out of scope

- No SVG-based winding line — alternating margin offsets are enough for v1.
- No animation on path scroll (beyond a one-time fade-in).
- No multi-path support yet (single "letters" path). Structure the `PresetPath` component so a future `paths: Path[]` prop is trivial, but ship one path for now.
- No tooltips on heatmap squares.
- No re-ordering / customisable paths.
- No new icons, fonts, or assets.

---

## Verification

End-to-end manual checks (run `npm run web` and click through):

1. **First launch (clean storage)** → app opens on **শিখি**. Confirmed by `AsyncStorage.removeItem('bornomala.lastTab.v1')` in browser devtools, then full reload.
2. **Tab persistence** → open **শেখার পথ**, hard-reload → app reopens on **শেখার পথ**. Repeat with **অক্ষর**.
3. **Menu does NOT persist** → open **মেনু** drawer, hard-reload → app reopens on whichever content tab was active before opening menu, never the drawer.
4. **Path → Start** → on path tab, tap **শুরু** on the current node. App switches to **শিখি** with that preset's first card showing.
5. **Path → tap any node** → soft gating works; non-current nodes also navigate to **শিখি** with the chosen preset.
6. **Path long-press a preset node** → reset confirmation dialog appears; confirming clears that preset's progress only.
7. **Heatmap colour reflects mastery** → grade enough cards in **শিখি** to mark a few mastered, return to **শেখার পথ**, those cells are green.
8. **Heatmap tap → letter** → tap any cell, app switches to **শিখি** with that letter selected. Same as today's letter-grid tap.
9. **Menu cleanup** → open **মেনু**: no প্রিসেট collapsible. Stats and full-reset still work. Footer/version intact.
10. **All presets complete** → after marking every preset complete, the path shows the celebratory state (last node "current"-styled with a 🎉 / "সব শেষ" message instead of START).
11. **TypeScript** → `npx tsc --noEmit` returns no new errors.
12. **Smallest viewport** → check label `শেখার পথ` fits in the bottom-tab slot at iPhone SE width without truncation; if it truncates, use `adjustsFontSizeToFit` or shorten to `পথ`.

---

## Open follow-ups (not part of this plan)

- Future paths (words, simple sentences) — schema would extend `PracticePreset` with a `pathId`, and `PRACTICE_PATHS` would group presets per path.
- Animated winding line / SVG renderer once multiple paths exist.
- Heatmap tooltip showing the letter and mastery count.
