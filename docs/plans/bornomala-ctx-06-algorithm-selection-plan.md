# Bornomala — CTX-06 Algorithm v2 Selection (Execution Plan)

**Status**: Awaiting approval
**Owner**: Bappy
**Date**: 2026-05-06
**Author tool**: Claude Code (claude-sonnet-4-6, thinking on)
**Source prompt**: [`docs/prompts/build/CTX-06-algorithm-selection.md`](../prompts/build/CTX-06-algorithm-selection.md)
**Spec**: [`docs/LEARNING-ALGORITHM.md`](../LEARNING-ALGORITHM.md) v2.0-draft-3, sections §5–§10
**Predecessor**: CTX-05 (commit `040a75a`) — schema, migration, streak-after-warmup `applyGrade` already landed and passed CTX-05R.

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`) with thinking on
- Complexity: Medium-High
- Reason: Spec §8–§10 require careful traversal — visibility weights, hard rules, active-set transitions, struggle mode. State-flow change touches `App.tsx` grade handler.

---

## Context

### Why this change is being made

Bappy's first real teaching session showed students bouncing on 2–3 cards with no rhythm and no shrinking under struggle. Commit `ba718c3` shipped a partial newcomer-boost subset to break the worst of the bouncing, but it is *not* the spec — it uses `seenCount` for newcomer decay (wrong signal), top-5 pool ranking (not active-set), no anti-immediate-repeat as a hard rule of `visibilityScore`, no struggle mode, no active-set lifecycle. CTX-06 lands the full §8/§10 selection logic that will *feel* different in the classroom: cards alternate, struggle shrinks the rotation, new cards dominate visibility for ~8 reps, and same-card-twice-in-a-row is impossible whenever active.size > 1.

Sprinkle eligibility, mastered-card resurfacing, and path-completion are deliberately deferred to CTX-07. CTX-06 is the *selection brain*; CTX-07 is the *retention layer* on top.

### The ba718c3 supersession

The prerequisites callout in the prompt is firm: replace ba718c3's code in [`lib/learning.ts`](../../lib/learning.ts) with the spec. After this prompt:
- `NEWCOMER_BOOST_MAX`, `NEWCOMER_DECAY_REPS`, `W_WRONG`, `POOL_SIZE` constants → **removed** (no dead tunables left in file).
- The old `visibilityScore(progress: LetterProgress)` shape → **replaced** with `visibilityScore(card, cardProgress, state)` per spec §8.
- The old `chooseNextCard(cards, progress, previousCardId)` signature → extended with optional `session?` and `rng` per spec §10. Backward compat stays for now (App.tsx wires real session in Task 6).

I also re-read [`docs/plans/bornomala-algorithm-newcomer-boost.md`](bornomala-algorithm-newcomer-boost.md) — confirmed nothing else escaped that ship. Only `lib/learning.ts` was changed by ba718c3; `App.tsx` and the schema were untouched. The newcomer intent is preserved by the spec's `attemptsSinceEnteringActive` + `NEW_CARD_BOOST_DURATION/WEIGHT` design.

### Intended outcome

After CTX-06 ships, a fresh learner running through `অ আ ই …`:
1. Starts with a 2-card active set (`অ আ`) — never see card #3 yet.
2. Alternates strictly (anti-repeat is hard); opens at `অ → আ → অ → আ → …`.
3. Each card carries warm-up budget = 5; first counted-correct on either active card grows the set 2 → 3, dropping ই in with full newcomer boost.
4. Newcomer dominates the rotation for ~8 reps then blends.
5. Two wrongs inside the last 6 grades → struggle mode: active set shrinks to top 2 by `struggleScore`. Six consecutive corrects → restore.
6. Mastery still works as-is from CTX-05 (`applyGrade` untouched). When mastery fires, active-set 1-for-1 replacement kicks in.
7. **No visible UI change** — the practice surface, top bar, per-card streak indicator, animations, and component tree are untouched.

---

## Approach

This is a state-flow change in two files, plus tests. No UI changes. No schema changes (CTX-05 already added `attemptsSinceEnteringActive`, `enteredActiveAt`, `recentResults`, etc.).

### Files modified

| File | What changes |
|---|---|
| [`lib/learning.ts`](../../lib/learning.ts) | Add `SessionState` + `initSessionState`. Add §6 tunables. Replace `visibilityScore` (new signature). Replace `chooseNextCard` (new optional `session`/`rng`). Add `applyActiveSetOnCorrect`, `applyActiveSetOnMastery`, `maybeEnterStruggleMode`, `maybeExitStruggleMode`, `struggleScore`, `weightedRandomPick`. Export `pushBounded`. Remove `NEWCOMER_BOOST_MAX`, `NEWCOMER_DECAY_REPS`, `W_WRONG`, `POOL_SIZE`. |
| [`App.tsx`](../../App.tsx) | Add `useState<SessionState>` initialized via `initSessionState`. Reset on preset change. Rewrite `handleGrade` to: derive `wasFirstCountedCorrect` and `wasJustMastered` from old/new progress, run lifecycle helpers, run struggle helpers, call `chooseNextCard` with session, then advance session (`twoBackCardId`, `previousCardId`, `cardsShown`). Increment `attemptsSinceEnteringActive` on the chosen card per spec §10. |
| [`lib/learning.test.ts`](../../lib/learning.test.ts) | Extend with cases per prompt Task 7 — visibilityScore hard rules + newcomer decay; chooseNextCard anti-repeat over 200 trials, weighted distribution over 1000 trials, single-card fallback; active-set growth on first counted-correct; mastery 1-for-1 replacement; struggle enter/exit. Use seeded `mulberry32` for determinism. |

### Reused / preserved

- `getProgressForCard`, `getUnlockedCards`, `applyGrade`, `migrateProgress`, `MASTERY_TARGET`, `WARMUP_PER_CARD`, `RECENT_WINDOW`, `PENALTY_MAX` — untouched.
- `pushBounded` already exists internally as a private helper (line 103) — promote to `export` so the App.tsx grade handler can use it for `recentGrades`.
- `LetterCard.order` field exists on every card (used as deterministic tiebreaker for path traversal).
- The existing internal `pushBounded` semantics (slice if at-or-over max) are correct for `RECENT_WINDOW = 6`.

### Per-card `attemptsSinceEnteringActive` — where the increment lives

Spec §10 says "after picking, the caller updates session state … chosen.attemptsSinceEnteringActive += 1". Per-card state lives on `progress`, so the increment happens in `App.tsx` `handleGrade`, *after* `chooseNextCard` returns, on the chosen card's `LetterProgress`. Reset to 0 happens in two places:
1. `applyActiveSetOnCorrect` returns the new session state but cannot mutate per-card progress — the **App.tsx grade handler** is responsible for resetting `attemptsSinceEnteringActive = 0` and stamping `enteredActiveAt = now` on the newly-entered card from the path.
2. `applyActiveSetOnMastery` similarly: App.tsx must reset the new card's per-card boost counter.

This is reflected in spec §9 ("…`attemptsSinceEnteringActive = 0`") and the prompt Task 4 note: "(do this in App.tsx grade handler, since per-card state lives there)".

### Active-set helpers — pure-function shape

Per Task 4 / spec §9, both helpers return a new `SessionState`:
- `applyActiveSetOnCorrect(state, cardId, cardProgress, path)` — append next path card if `state.activeSet.length < ACTIVE_SET_STEADY` AND `state.inStruggleMode === false`. (The "first counted-correct" gating happens in App.tsx, which decides whether to call this at all.)
- `applyActiveSetOnMastery(state, masteredCardId, path)` — remove mastered ID from `activeSet`; append next un-entered path card if any.

"Next un-entered" = first card from `path` whose id is not currently in `state.activeSet` AND whose `LetterProgress.enteredActiveAt === null`. Wait — `enteredActiveAt` is per-card and updated by App.tsx. The helper signature takes only `path` (not `progress`), so it must use `state.activeSet` membership + the path's order. Spec §9 says "next un-entered card from the path"; in practice this means: first card in `path` that is neither in `state.activeSet` nor in any prior `state.activeSet` snapshot. Simplest invariant: walk the path, pick the first card that's not currently in `state.activeSet` AND whose `enteredActiveAt` (passed in) is null. To keep the helper *pure with no progress dep*, I'll pass `progress` into both helpers. The prompt's exact signatures are:

```ts
applyActiveSetOnCorrect(state, cardId, cardProgress, path)
applyActiveSetOnMastery(state, masteredCardId, path)
```

`applyActiveSetOnMastery` doesn't take `progress` — but path-order is enough if we treat `state.activeSet` as the running ledger of "entered" plus mastered IDs that already left. We can reconstruct "entered" by tracking the maximum `path.indexOf(id)` ever in `activeSet` — except that's lossy across struggle-mode shrinks (`prePushedActiveSet` saves the snapshot). Cleanest implementation: the **first card in `path` whose id is not in `state.activeSet`** AND **not in `state.prePushedActiveSet`** AND **not mastered already** … which still needs `progress`.

**Decision (departure from prompt sig)**: keep prompt signatures as written but pass `progress` *into* the helper indirectly by making "next un-entered" mean: walk `path` in order; the first card whose id is not in `state.activeSet` AND not in `state.prePushedActiveSet ?? []`. Mastered cards are never re-added because once removed by `applyActiveSetOnMastery`, they don't go back into the active set in this CTX (sprinkle is CTX-07). This matches spec §9 "1-for-1 replacement on mastery" — the mastered card leaves; the first card from the path that hasn't been touched yet enters. If we re-enter a previously-shrunk card from `prePushedActiveSet`, that's struggle-mode restore territory, handled by `maybeExitStruggleMode`, not by the unlock helper.

I'll add a private `nextUnenteredFromPath(path, state)` helper to encapsulate the rule.

### Struggle mode — exact transitions

Per Task 5 / spec §9:
- **Enter**: `count(state.recentGrades, 'w') >= STRUGGLE_WRONG_THRESHOLD` (i.e. ≥ 2) AND not already in struggle. Save `prePushedActiveSet = activeSet`. Shrink `activeSet` to top `ACTIVE_SET_STRUGGLE` (= 2) by `struggleScore(card)` = `consecutiveMistakes * 3 + penalty + count(recentResults, 'w')`. The shrinker needs `progress` to compute scores → helper signature must take `progress`.
- **Exit**: `state.consecutiveCorrectInSession >= STRUGGLE_RECOVERY_STREAK` (= 6) AND in struggle. `activeSet = prePushedActiveSet`. Clear `prePushedActiveSet = null`.

Edge case: if `prePushedActiveSet` had cards that have since been mastered while in struggle mode, restoring them would put a mastered card back into rotation. The spec doesn't address this directly. Defensive choice: filter mastered IDs out of the restored set; if anything is filtered, don't bother backfilling here (let the next `applyActiveSetOnMastery` invocation backfill on next mastery). For CTX-06 simplicity, restore the snapshot **as-is** — mastered cards in `activeSet` will get filtered out by `visibilityScore`'s mastered-returns-0 rule, so they won't actually surface. This is functionally correct without needing extra logic.

### `chooseNextCard` selection

Per spec §10 + Task 3:
1. If `session.activeSet.length === 1` → return that card (single-card fallback, no anti-repeat applies).
2. Map `session.activeSet` IDs to `[card, visibilityScore(card, progress[id], session)]` pairs. The `cards` argument is the path; pull the LetterCard objects by id.
3. Filter to score > 0.
4. If empty → return first non-`previousCardId` in `activeSet`, or first if none non-prev.
5. `weightedRandomPick(scored, rng)` — total = sum of weights, draw `r = rng() * total`, walk and decrement.

For backward compat (Task 3): when `session` is undefined, build a transient session from `cards` and `progress`:
- `previousCardId` from the third arg
- `activeSet` = first 2 unmastered card ids from `cards`
- empty `recentGrades`, `prePushedActiveSet = null`, `inStruggleMode = false`, etc.
- This keeps existing call sites that haven't migrated yet from breaking. The **App.tsx call site WILL migrate in Task 6**, so the transient path is mostly a safety net.

### Wiring `App.tsx` (Task 6)

The grade handler is currently 23 lines (732–755). Rewrite per the prompt's snippet, with these specifics:

1. **Add session state** at the top of `App` (after the existing `useState` calls):
   ```ts
   const [session, setSession] = useState<SessionState>(() =>
     initSessionState(DEFAULT_PRESET.cards, {}),
   );
   ```
2. **Reset on preset change**: add a `useEffect` that watches `selectedPresetId` and rebuilds session via `initSessionState(selectedPresetCards, progress)`.
3. **Reset on hydration**: after the AsyncStorage load (existing `useEffect` at 452) sets `progress`, also rebuild session via `initSessionState`. This avoids stale empty session after refresh.
4. **`handleReset`** (line 757) already wipes progress + currentCardId — also reset session here via `initSessionState(DEFAULT_PRESET.cards, {})`.
5. **`handleResetLetter`** — review callsite; if it modifies progress for the active card, the session may need to refresh `activeSet` if the reset card is mastered or sprinkle-mastered. For CTX-06 minimum: leave `activeSet` alone; `chooseNextCard` will simply re-evaluate based on new progress. Letter reset is a teacher override, infrequent; do NOT muck with session here.
6. **Rewrite `handleGrade`**:
   ```ts
   function handleGrade(wasCorrect: boolean) {
     const current = getProgressForCard(progress, currentCard.id);
     const nextProgress = applyGrade(progress, currentCard.id, wasCorrect);
     const next = getProgressForCard(nextProgress, currentCard.id);

     const wasFirstCountedCorrect =
       wasCorrect &&
       current.correctCount === WARMUP_PER_CARD &&
       next.correctCount === WARMUP_PER_CARD + 1;
     const wasJustMastered = !current.mastered && next.mastered;

     let nextSession: SessionState = {
       ...session,
       recentGrades: pushBounded(session.recentGrades, wasCorrect ? 'c' : 'w', RECENT_WINDOW),
       consecutiveCorrectInSession: wasCorrect ? session.consecutiveCorrectInSession + 1 : 0,
     };

     // Active-set lifecycle (the helper appends; we then bookkeep the new entrant's per-card state)
     let progressAfterUnlock = nextProgress;
     const beforeUnlockSize = nextSession.activeSet.length;
     if (wasFirstCountedCorrect) {
       nextSession = applyActiveSetOnCorrect(nextSession, currentCard.id, next, selectedPresetCards);
     }
     if (wasJustMastered) {
       nextSession = applyActiveSetOnMastery(nextSession, currentCard.id, selectedPresetCards);
     }
     // Reset attemptsSinceEnteringActive=0 + stamp enteredActiveAt for any newly-appended card
     if (nextSession.activeSet.length > beforeUnlockSize) {
       const entrantId = nextSession.activeSet[nextSession.activeSet.length - 1];
       const entrant = getProgressForCard(progressAfterUnlock, entrantId);
       progressAfterUnlock = {
         ...progressAfterUnlock,
         [entrantId]: { ...entrant, attemptsSinceEnteringActive: 0, enteredActiveAt: new Date().toISOString() },
       };
     }
     // Mastery removed an entry; activeSet may be smaller AND may have grown (see helper). Same logic above covers it.

     // Struggle mode
     nextSession = wasCorrect
       ? maybeExitStruggleMode(nextSession, selectedPresetCards)
       : maybeEnterStruggleMode(nextSession, progressAfterUnlock, selectedPresetCards);

     const chosen = chooseNextCard(
       selectedPresetCards,
       progressAfterUnlock,
       currentCard.id,
       nextSession,
     );

     // bump chosen card's attemptsSinceEnteringActive (spec §10)
     const chosenProgress = getProgressForCard(progressAfterUnlock, chosen.id);
     const finalProgress = {
       ...progressAfterUnlock,
       [chosen.id]: {
         ...chosenProgress,
         attemptsSinceEnteringActive: chosenProgress.attemptsSinceEnteringActive + 1,
       },
     };

     nextSession = {
       ...nextSession,
       twoBackCardId: nextSession.previousCardId,
       previousCardId: chosen.id,
       cardsShown: nextSession.cardsShown + 1,
     };

     playFeedback(wasCorrect);
     setProgress(finalProgress);
     setSession(nextSession);
     setCurrentCardId(chosen.id);
     setSessionStats((c) => ({
       attempts: c.attempts + 1,
       correct: c.correct + (wasCorrect ? 1 : 0),
       wrong: c.wrong + (wasCorrect ? 0 : 1),
     }));
   }
   ```

   Note: `nextPracticeCards` and `nextUnlockedCards` derivations from the old handler are dropped — `chooseNextCard` now operates on the path + session, not the filtered practice list. The existing `useEffect` (line 574) still ensures `currentCardId` lives within `effectivePracticeCards`, so the practice-list filter still works.

   **Important caveat**: when the user is on a non-`unlocked` practice list (e.g. `mastered` only), `chooseNextCard` may pick a card outside that filter. The current v1 handler avoids this by calling `chooseNextCard(nextPracticeCards, ...)`. CTX-06 must preserve this: if `selectedPracticeList !== 'unlocked'`, the active set is meaningless — that's a teacher-override scenario. Solution: pass `effectivePracticeCards` (the filtered list) as the `cards` argument to `chooseNextCard`, but the **active set** in `session` only makes sense for the full path. Compromise: if `selectedPracticeList === 'unlocked'` (the default flow), use the session-driven path. Otherwise, fall back to the legacy uniform pick over `effectivePracticeCards` (the existing v1 behavior). Cleaner: keep `chooseNextCard` driven by the session's active set always, and make the practice-list filter a *teacher override* to be addressed in §15 spec work later. **For CTX-06 I will keep behavior identical for the unlocked list and let the session drive selection there; for the other lists I will keep the v1 uniform-from-filter fallback.** This keeps the change scoped and matches the prompt's "Do NOT change UI rendering, component structure, or any visible behavior."

   Implementation: branch in `handleGrade`:
   ```ts
   const chosen = selectedPracticeList === 'unlocked'
     ? chooseNextCard(selectedPresetCards, progressAfterUnlock, currentCard.id, nextSession)
     : pickFromPracticeList(nextPracticeCards, currentCard.id);  // v1 fallback (preserve existing behavior)
   ```
   Where `pickFromPracticeList` mirrors the legacy `chooseNextCard` body (uniform-random with anti-repeat). Or simpler: call `chooseNextCard(nextPracticeCards, progressAfterUnlock, currentCard.id)` *without* the session arg — the backward-compat transient path will handle it.

### Tests (Task 7)

`lib/learning.test.ts` extension. Add a `mulberry32` seeded RNG at top:
```ts
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

Cases (matches the prompt's minimum):
1. `visibilityScore`: previous-card returns 0 when `activeSet.length > 1`.
2. `visibilityScore`: previous-card returns nonzero when `activeSet.length === 1`.
3. `visibilityScore`: mastered card returns 0.
4. `visibilityScore`: newcomer boost decays from `NEW_CARD_BOOST_WEIGHT` (8) at attempt 0 to 0 at attempt `NEW_CARD_BOOST_DURATION` (8).
5. `chooseNextCard`: never returns `previousCardId` over 200 trials when `activeSet.length > 1`.
6. `chooseNextCard`: weighted distribution favors highest-score card over 1000 trials (top card chosen ≥ 35% when 2nd is half-weight). Use seeded RNG.
7. `chooseNextCard`: single-card fallback returns the only card.
8. `applyActiveSetOnCorrect`: first counted-correct grows from 2 → 3.
9. `applyActiveSetOnCorrect`: subsequent counted-corrects do NOT grow further.
10. `applyActiveSetOnMastery`: mastered card removed; next path card appended.
11. `maybeEnterStruggleMode`: 2 wrongs in last 6 enters mode; active set shrinks to top 2 by `struggleScore`.
12. `maybeExitStruggleMode`: 6 consecutive correct exits; active set restored.

### Critical files to modify

| Path | Section | Change |
|---|---|---|
| [`lib/learning.ts`](../../lib/learning.ts) | top constants | add `ACTIVE_SET_*`, `STRUGGLE_*`, `NEW_CARD_BOOST_*`, `W_*` |
| [`lib/learning.ts`](../../lib/learning.ts) | new types | add `SessionState`, `initSessionState` |
| [`lib/learning.ts`](../../lib/learning.ts) | replace lines 241–298 | swap `visibilityScore` + `chooseNextCard` to spec |
| [`lib/learning.ts`](../../lib/learning.ts) | new helpers | `applyActiveSetOnCorrect`, `applyActiveSetOnMastery`, `maybeEnterStruggleMode`, `maybeExitStruggleMode`, `struggleScore`, `weightedRandomPick`, `nextUnenteredFromPath`, export `pushBounded` |
| [`lib/learning.ts`](../../lib/learning.ts) | remove | `NEWCOMER_BOOST_MAX`, `NEWCOMER_DECAY_REPS`, `W_WRONG`, `POOL_SIZE` |
| [`App.tsx`](../../App.tsx) | imports (25–35) | add `SessionState`, `initSessionState`, lifecycle helpers, `pushBounded`, `RECENT_WINDOW`, `WARMUP_PER_CARD` |
| [`App.tsx`](../../App.tsx) | state declarations (~437) | add `session` `useState` |
| [`App.tsx`](../../App.tsx) | hydration effect (~452) | rebuild session after progress loads |
| [`App.tsx`](../../App.tsx) | preset-change effect (new) | rebuild session on `selectedPresetId` change |
| [`App.tsx`](../../App.tsx) | `handleGrade` (732–755) | full rewrite per snippet above |
| [`App.tsx`](../../App.tsx) | `handleReset` (757) | reset session via `initSessionState(DEFAULT_PRESET.cards, {})` |
| [`lib/learning.test.ts`](../../lib/learning.test.ts) | append | 12 new test cases + `mulberry32` |

---

## Verification

End-to-end checks before commit:

1. **Static**: `npm run typecheck` — must PASS.
2. **Unit**: `npx tsx --test lib/learning.test.ts` — all CTX-05 tests still pass + 12 new pass.
3. **Web manual scenario** (from prompt, plus a few extras):
   - Start fresh state. Grade ✓ ✗ ✓ ✓ ✗ ✗ ✓ ✓ ✓ ✓ ✓ ✓.
   - Confirm: never the same card twice in a row.
   - After warm-up clears (5 corrects on either active card), a 3rd card joins.
   - After 2 wrongs in last 6, the active rotation shrinks to 2.
   - After 6 consecutive corrects, restore.
   - **No visible UI change** — bar, indicators, animations identical.
4. **Regression sweep**: Letters tab still loads; preset switch still resets the practice card; reset-letter still works; reload preserves progress (session rebuilds from scratch which is correct per spec §7.3).
5. **Out-of-scope guards** (CTX-06R will check):
   - `applyGrade` body unchanged from CTX-05.
   - `migrateProgress` body unchanged.
   - No `Math.random` calls outside the injected `rng` (search lib/learning.ts after edit).
   - No edits to `docs/LEARNING-LOGIC.md` or `docs/PRODUCT-LOGIC.md` (CTX-07 owns).
6. **Commit** as a single atomic change:
   ```
   git add lib/learning.ts lib/learning.test.ts App.tsx
   git commit -m "feat(algo): v2 chooseNextCard — supersedes ba718c3 newcomer-boost subset"
   git push origin main
   ```
   Commit body should include: visibility score, active-set lifecycle, struggle mode summary; reference ba718c3.

7. After push, mark `docs/prompts/build/CTX-06-algorithm-selection.md` Status to ✅ Done and append "Result" section.

---

## Risks / Watch-outs

- **Practice list other than `unlocked`** — addressed via fallback (see Wiring). If reviewer wants the active set to drive selection regardless of practice-list filter, that's a deferred decision (likely tied to §15 teacher overrides). Keeping current behavior is the safe choice.
- **Session rebuild on hydration** — if AsyncStorage load happens after first paint, session may briefly point at a card the user hasn't seen. The existing `useEffect` (line 574) already handles `currentCardId` validity; for session, `initSessionState` rebuilds activeSet from path's first un-mastered cards, which is always valid.
- **`prePushedActiveSet` restore with mid-session mastery** — covered by visibility-score's mastered-returns-0 rule, so restored mastered cards stay quiet without extra logic.
- **`attemptsSinceEnteringActive` increment placement** — must happen on the chosen card *post-selection*, before the next render. Done in `handleGrade` after `chooseNextCard` returns.

---

## What this plan does NOT do (CTX-07 territory)

- Sprinkle eligibility, `sprinkleCooldown` decrement, mastered-card resurfacing.
- Path-completion celebration & sprinkle-only mode.
- `docs/LEARNING-LOGIC.md` / `docs/PRODUCT-LOGIC.md` doc alignment.
- Newly-mastered quiet period activation in `visibilityScore` (the field exists from CTX-05 but isn't read here).
