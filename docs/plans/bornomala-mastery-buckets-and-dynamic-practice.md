# Bornomala — Mastery Buckets + Dynamic Practice + Time-Based Mode

**Status**: Draft — supersedes v2. Ships as a single v1→v3 migration; v2 is folded in, not shipped separately.
**Owner**: Bappy
**Created**: 2026-05-05

---

## Recommended Model
- Model: Opus 4.6 (`claude-opus-4-6`)
- Complexity: High
- Reason: Touches the scheduler, persistence schema, and adds a new session model. Get this wrong once and learner data goes stale.

---

## Context

The v1 scheduler is a greedy MVP. v2 was a half-step (streaks + struggle-mode), and during planning of the time-based + buckets layer it became clear v2 should not ship alone — buckets and the dynamic window depend on v2's streak/recent-results signal, and shipping them separately means two schema migrations and two rounds of regression testing for the same end state. **Decision (2026-05-05): fold v2 into v3 as one shipment.** v2's plan file is marked superseded.

After the first real teaching session, three more gaps surfaced that v2 alone wouldn't have closed even if shipped:

1. **Per-letter mastery is binary today** (`mastered: boolean`). Bappy wants a *percentage* per letter so progress is visible item-by-item, not just at the path level.
2. **Active list is too rigid.** v1 unlocks +2 each time the whole set is mastered. Real sessions need a tiny, sliding window — *4–5 active letters at any moment*, mastered ones drop out and new ones backfill in real time, regardless of preset paths.
3. **No way to "graduate" a letter.** Once truly learned, it should leave the rotation entirely (after a few long-interval refreshes), so the user can level up.
4. **No infinite/time-based mode.** Today every practice session is target-based ("master this set"). Sometimes the user has 5–10 minutes and just wants to practice; the app should fill that time intelligently, not run out of cards or cycle the same easy ones.

This plan absorbs v2's streak+struggle scheduler and adds the four capabilities above as one combined v3 shipment. The user migrates from v1 directly to v3 — no intermediate v2 release.

---

## What This Plan Adds

1. **Streak-based mastery + struggle-mode adaptation** (folded in from v2).
2. **Per-letter Mastery%** — exposed as a derived field, not stored.
3. **Three-bucket system** — Active → Maintenance → Graduated. Letters move automatically.
4. **Dynamic Practice mode** — sliding window of 4–5 Active letters, auto-curated, runs forever.
5. **Time-based session** — practice for N minutes, scheduler picks from Active + due Maintenance until the timer ends.

This plan does **not** change preset paths. Preset paths remain target-based and use the v3 scheduler. Dynamic Practice is a *new* mode users can enter from any tab.

---

## 1. Three-Bucket System

Every card sits in exactly one bucket at any time. Bucket is **derived**, not stored — computed from the existing v2 fields plus two new ones.

| Bucket | Definition | Behavior |
|---|---|---|
| **Active** (সক্রিয়) | `!mastered` OR (`mastered` AND `maintenanceReviewsDone < MAINT_TARGET` AND due now) | In rotation; weight via v2 visibility score |
| **Maintenance** (পুনরাবৃত্তি) | `mastered` AND `maintenanceReviewsDone < MAINT_TARGET` AND not yet due | Out of rotation; resurfaces when next review is due |
| **Graduated** (পরিপূর্ণ) | `mastered` AND `maintenanceReviewsDone >= MAINT_TARGET` | Never tested again. Counts toward "ready for next level" |

**Constants (tunable):**
- `MAINT_TARGET = 6` — total maintenance reviews required to graduate (user said "5 to 10"; pick 6 to start, log a tuning note)
- `MAINT_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60]` — gap between maintenance reviews 1..6 (days since previous correct review)
- `MAINT_PASS_RULE` — a maintenance review counts only if answered correctly. Wrong answer → bumps the card back to **Active** with `streak = 0` (don't lose the maintenance count, but the next review is rescheduled to interval[0]).

---

## 2. Schema Additions

Single combined v3 shape (storage key: `bornomala.progress.v1` → `bornomala.progress.v3`, no intermediate v2 store ships):

```ts
type LetterProgress = {
  // v1 fields (preserved)
  correctCount: number;
  wrongCount: number;
  seenCount: number;
  mastered: boolean;
  lastSeenAt: string | null;

  // v2 fields (folded in)
  streak: number;
  bestStreak: number;
  penalty: number;             // visibility multiplier; 0 = clean
  consecutiveMistakes: number;
  recentResults: ('c' | 'w')[]; // rolling window, max RECENT_WINDOW
  firstSeenAt: string | null;

  // v3 additions (buckets + maintenance)
  masteredAt: string | null;          // ISO; set when mastery first reached
  maintenanceReviewsDone: number;      // 0..MAINT_TARGET
  nextMaintenanceDueAt: string | null; // ISO; null if Active or Graduated
  graduatedAt: string | null;          // ISO; set when reviewsDone === MAINT_TARGET
};
```

**Migration (v1 → v3)**: One-time on hydrate.
- Existing v1 fields copy through unchanged.
- v2 fields default: `streak = 0`, `bestStreak = 0`, `penalty = 0`, `consecutiveMistakes = 0`, `recentResults = []`, `firstSeenAt = lastSeenAt ?? null`.
- v3 fields default: if `mastered === true` → `masteredAt = lastSeenAt`, `maintenanceReviewsDone = 0`, `nextMaintenanceDueAt = now + 1 day`. Otherwise all null/0.

No prior v2 store exists in production, so no v2-specific migration path needed.

---

## 3. Derived: Per-Letter Mastery%

Two numbers per letter, both computed (not stored). Show whichever the UI needs.

```ts
// Progress toward mastery (the "are we there yet" number)
masteryPct = Math.min(streak / MASTERY_TARGET, 1) * 100;

// Lifetime accuracy (the "how reliably do they know it" number)
accuracyPct = correctCount / Math.max(seenCount, 1) * 100;
```

UI uses `masteryPct` for the per-letter progress bar; `accuracyPct` shows in the stats screen as a secondary label.

---

## 4. Dynamic Practice Mode (the "no preset" mode)

A new entry point, separate from preset paths. The user taps **"Dynamic Practice"** and the scheduler manages a 4–5 letter sliding window automatically.

**Selection algorithm:**

```
function pickDynamicWindow(progressByCard, allCards):
  WINDOW_SIZE = 5

  active = cards where bucket === Active AND not graduated
  candidates = sortBy(active, [
    -1 * masteryPct,           // least-mastered first
    -1 * recentMistakes,       // strugglers prioritized
    firstSeenAt                // older first (don't ignore early items)
  ])

  // If fewer than WINDOW_SIZE active, backfill from the next locked letters
  // in canonical Bangla order until we hit WINDOW_SIZE.
  if candidates.length < WINDOW_SIZE:
    candidates += unlockNext(allCards, progressByCard, WINDOW_SIZE - candidates.length)

  return candidates.slice(0, WINDOW_SIZE)
```

**Key rules:**
- Window recomputes on every card transition. The moment a card masters, it drops out and the next locked letter slots in.
- Maintenance cards that come due during a Dynamic session are inserted into the rotation that turn (priority: `nextMaintenanceDueAt < now` always shown next).
- Exhaustion: if no Active candidates remain (everything is Graduated up to current level), the mode shows "Level up?" and offers to unlock the next preset segment.

**No "Mark as known"**: graduation is earned through maintenance reviews, not asserted by the user. Avoids false positives.

---

## 5. Time-Based Session Mode

A new session wrapper that overlays *any* practice mode (Dynamic or preset).

**Entry**: user picks a duration — `5 min`, `10 min`, `∞ (until I stop)`.
**During**: a small timer chip in the header counts down (or up, for ∞). Cards keep flowing per the underlying scheduler.
**End**: at timer expiry, current card finishes, then the session-end summary shows: cards seen, mastery% gain across the window, accuracy this session, time spent. No "you finished" — it's an interval, not a target.

**Session record** (new, persisted):

```ts
type PracticeSession = {
  id: string;
  startedAt: string;
  endedAt: string | null;       // null while in progress
  durationMs: number | null;    // null for ∞
  mode: 'dynamic' | 'preset';
  presetId?: string;
  cardsSeen: number;
  correctCount: number;
  wrongCount: number;
  graduatedThisSession: string[]; // card IDs
};
```

Stored under `bornomala.sessions.v1` as a rolling list (last 30 sessions). Powers the stats tab.

---

## 6. Maintenance Scheduling — Cross-Session

When a card hits mastery (`streak === MASTERY_TARGET` for the first time):

```
masteredAt = now
maintenanceReviewsDone = 0
nextMaintenanceDueAt = now + MAINT_INTERVALS_DAYS[0]  // +1 day
```

When a maintenance review is **passed** (correct answer while card is in Maintenance):

```
maintenanceReviewsDone += 1
if maintenanceReviewsDone >= MAINT_TARGET:
  graduatedAt = now
  nextMaintenanceDueAt = null
else:
  nextMaintenanceDueAt = now + MAINT_INTERVALS_DAYS[maintenanceReviewsDone]
```

When a maintenance review is **failed** (wrong answer):

```
streak = 0                   // back to Active
maintenanceReviewsDone stays  // don't punish but don't reward
nextMaintenanceDueAt = null   // re-schedule once they re-master
mastered stays true           // sticky; just re-enters rotation
```

**Why calendar days (locked decision, 2026-05-05)**: sessions are short and irregular; only wall-clock survives a 3-day gap. Trade-off: a card can sit due for weeks if the user disappears — acceptable, as Dynamic mode just shows it the next time the user practices.

---

## 7. Affected Files

**New:**
- `lib/maintenance.ts` — bucket classifier, due-check, schedule advance
- `lib/sessions.ts` — start/end/persist `PracticeSession`
- `app/practice/dynamic.tsx` (or equivalent route) — Dynamic Practice screen
- `components/TimerChip.tsx` — countdown UI for time-based sessions
- `components/SessionEndSheet.tsx` — end-of-session summary

**Modified:**
- `lib/learning.ts` — schema bump v2→v3, migrate(), expose `getBucket(card, progress)`, `getMasteryPct(progress)`, `getAccuracyPct(progress)`
- `lib/learning.test.ts` — add bucket transition tests, maintenance schedule tests, dynamic window tests
- `App.tsx` — hydrate migration, mount new entry point, integrate timer
- `docs/LEARNING-ALGORITHM.md` — append v3 section: buckets, dynamic mode, time mode, maintenance schedule
- `docs/PRODUCT-LOGIC.md` — document the three buckets in user-facing language (সক্রিয়/পুনরাবৃত্তি/পরিপূর্ণ)
- `docs/plans/bornomala-learning-algorithm-v2.md` — mark **SUPERSEDED** at the top with a pointer to this file; keep the file for design history

**Untouched**:
- v1 selection priorities (`chooseNextCard`) for preset paths still work; the bucket layer just filters the candidate pool
- Existing path screens — Dynamic Practice is additive, not a replacement

---

## 8. Open Questions (resolve before implementation)

**Resolved 2026-05-05:**
- ~~v2 vs v3 sequencing~~ → fold into one v3 shipment.
- ~~Maintenance gap basis~~ → calendar days, intervals `[1, 3, 7, 14, 30, 60]`.

**Still open:**
1. **`MAINT_TARGET = 6`** — user said 5–10. Lock the number or treat as a tunable constant in `lib/learning.ts`?
2. **Dynamic window size = 5** — confirm. v2 struggle-mode uses 4. Could match (4) or bump (5).
3. **First-time mastery sound/affirmation** — when a card graduates, do we surface a celebratory moment? (UX deferred but worth flagging.)
4. **Sessions persistence cap** — 30 sessions enough for stats? Or unlimited with a roll-up?

---

## 9. Verification

End-to-end checks before declaring done:

1. **Migration** — start with a populated `v2` store, hydrate in v3, confirm all mastered cards have `maintenanceReviewsDone = 0` and `nextMaintenanceDueAt` 1 day out. No data loss on `correctCount`/`wrongCount`/`streak`.
2. **Bucket classifier** — unit tests in `lib/learning.test.ts` for each bucket boundary (Active→Maintenance, Maintenance→Active on fail, Maintenance→Graduated on 6th pass).
3. **Dynamic window** — simulate 30 cards of practice; confirm window stays at 5 ± 1, mastered drops out, next locked letter backfills, no cycling on a single card.
4. **Time-based session** — start a 5-min ∞ session, fast-forward time, confirm timer expiry surfaces summary, session record persists, partial card counts correctly.
5. **Maintenance schedule** — fake-clock advance through 60 days; confirm a mastered card resurfaces at days 1, 4, 11, 25, 39, 69 (cumulative), graduates on the 6th pass.
6. **Integration smoke** — run on web (Expo) and one device. Practice for 10 minutes in Dynamic mode and confirm the active set never feels static or repetitive.

---

## 10. Out of Scope

- Audio pronunciation in maintenance reviews (deferred per CLAUDE.md)
- Cloud sync of `PracticeSession` history (Firebase plan exists separately)
- "Level up" ceremony / explicit unlock of next character class — flagged as a follow-up; for now, Dynamic mode just runs out gracefully when everything graduates.
- Adaptive interval tuning (SM-2/Anki-style) — fixed `[1, 3, 7, 14, 30, 60]` for v3; revisit after real-usage data.
