# Bornomala — Daily Session Cap + "Done for Today" Anti-Loop

## Recommended Model
- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Low–Medium
- Reason: Mechanical wiring — 4 constants, 1 pure helper, 2 state additions, AsyncStorage read/write, conditional render. No SRS changes.

---

## Context

Bappy is meeting a real user shortly and has confirmed a recurring problem: **users get stuck in an infinite repeat loop near the end of a list.** The bottom progress bar (per-card) stays full because the card has reached `MASTERY_TARGET=8`, but the top progress bar (preset mastery) doesn't move because the card hasn't graduated yet. The session has no exit condition, so the same card keeps being re-selected by the visibility scorer — especially after `activeSet` shrinks to 1 card, where the anti-repeat rule is intentionally disabled (`lib/learning.ts:490`).

**Root cause** (confirmed): `handleGrade` (`App.tsx:880`) → `chooseNextCard` (`lib/learning.ts:567`) loops forever. No session-attempt cap, no duration cap, no per-card-per-session cap. Wrong answers raise `penalty` and `visibilityScore`, which makes the stuck card *more* likely to repeat, not less.

**Goal:** ship a small, editable, celebratory exit gate so the user finishes feeling good and is asked to come back tomorrow — instead of grinding into monotony.

**Out of scope this pass:** push notifications, backend persistence, SRS changes, analytics, animations beyond the existing `Animated` feedback.

---

## Approach (one-line summary)

Add a **combined session cap** (any-of fires) that triggers a per-preset, per-day "Done for today" celebration screen. Cap state persists in AsyncStorage keyed by preset + local calendar date. All limits are named exports at the top of `lib/learning.ts` so Bappy can tune them in one line later.

---

## The Cap — Combined Gate (any-of fires)

| Constant | Default | Why |
|---|---|---|
| `SESSION_MAX_DURATION_MS` | `12 * 60 * 1000` (12 min) | Middle of Bappy's "10–15 min." Catches slow grinders. |
| `SESSION_MAX_ATTEMPTS` | `60` | Generous floor (~7 cards mastered worst-case at MASTERY_TARGET=8). Catches dense sessions. |
| `CARD_MAX_ATTEMPTS_PER_SESSION` | `10` | Directly kills the activeSet=1 cycling trap. Different copy when this fires. |

**Reset:** `YYYY-MM-DD` in local time, per `selectedPreset.id`. AsyncStorage key:
`porashikhi:sessionCap:v1:<presetId>` → `{ dateISO, reason: 'duration'|'attempts'|'card' }`.

A new local day → cap clears automatically on next mount / preset switch.

---

## What the User Sees When the Cap Fires

A celebration block rendered **inline in App.tsx** (no new component file) in place of the flashcard, when `sessionDone && sessionDone.presetId === selectedPreset.id`:

- Heading (Bangla): **"দারুণ! আজকের পড়া শেষ"** ("Great! Today's lesson done")
- Stats row from existing `sessionStats`: `ঠিক X · ভুল Y · মোট Z`
- Subtitle (varies by reason):
  - `duration` / `attempts`: **"আগামীকাল আবার আসুন — এই তালিকা চালিয়ে যেতে"**
  - `card`: **"আজকের জন্য যথেষ্ট অনুশীলন হয়েছে। কাল আবার চেষ্টা করুন"**
- Buttons:
  - **"অন্য তালিকা দেখুন"** → `setCurrentTab('letters')` (lets them browse other presets)
  - **"বন্ধ করুন"** (close — stays on done screen until daily reset)
  - **"রিসেট (টেস্ট)"** — gated behind `__DEV__`, clears the cap for testing

**Per-preset, not global.** Other presets remain playable.

---

## Implementation

### 1. `lib/learning.ts` — add constants + pure helper

**Location:** below the existing constants block (after line 34).

```ts
// Session caps (daily fatigue gate — see plans/bornomala-session-daily-cap-anti-loop.md)
export const SESSION_MAX_DURATION_MS = 12 * 60 * 1000;
export const SESSION_MAX_ATTEMPTS = 60;
export const CARD_MAX_ATTEMPTS_PER_SESSION = 10;
export const SESSION_CAP_STORAGE_PREFIX = 'porashikhi:sessionCap:v1:';

export type SessionCapReason = 'duration' | 'attempts' | 'card';

export function checkSessionCap(input: {
  attempts: number;
  startedAtMs: number;
  cardAttempts: Record<string, number>;
  nowMs: number;
}): SessionCapReason | null {
  if (input.nowMs - input.startedAtMs >= SESSION_MAX_DURATION_MS) return 'duration';
  if (input.attempts >= SESSION_MAX_ATTEMPTS) return 'attempts';
  for (const n of Object.values(input.cardAttempts)) {
    if (n >= CARD_MAX_ATTEMPTS_PER_SESSION) return 'card';
  }
  return null;
}
```

Pure → trivially unit-testable later.

### 2. `App.tsx` — extend session state

Around `App.tsx:108` extend `SessionStats`:
```ts
type SessionStats = {
  attempts: number;
  correct: number;
  wrong: number;
  startedAtMs: number;
  cardAttempts: Record<string, number>;
};
```
Update `initialSessionStats` initializer accordingly (search-and-replace).

Add new state:
```ts
const [sessionDone, setSessionDone] = useState<{ presetId: string; reason: SessionCapReason } | null>(null);
```

### 3. `App.tsx` — update `handleGrade` (~line 1020)

Inside the `setSessionStats` updater, also bump `cardAttempts[currentCard.id]`. After the state setter, run `checkSessionCap` against the new values and, if non-null:
- `setSessionDone({ presetId: selectedPreset.id, reason })`
- Fire-and-forget `AsyncStorage.setItem(SESSION_CAP_STORAGE_PREFIX + selectedPreset.id, JSON.stringify({ dateISO, reason }))`

Use `new Date().toISOString().slice(0,10)` for `dateISO` (UTC date is acceptable for v1; can switch to local later — note the tradeoff).

### 4. `App.tsx` — mount + preset-switch effect

A `useEffect` on `selectedPreset.id`:
- Read `SESSION_CAP_STORAGE_PREFIX + selectedPreset.id` from AsyncStorage.
- If `dateISO === today`, set `sessionDone`. Otherwise clear it (and remove the stale key).

### 5. `App.tsx` — render gate (~line 1170)

Before rendering the flashcard panel, if `sessionDone && sessionDone.presetId === selectedPreset.id`, render the inline celebration `<View>` instead. Reuse existing styles where possible (heading typography, button variants from the menu/reset flows).

### 6. `App.tsx` — clear cap on resets

In `handleReset` (line 1036), `handleResetLetter`, and any preset-level reset, also:
- `setSessionDone(null)`
- `AsyncStorage.removeItem(SESSION_CAP_STORAGE_PREFIX + presetId)` (or sweep all `SESSION_CAP_STORAGE_PREFIX` keys on full reset using `getAllKeys`).

### 7. Session-stats reset

Whenever `setSessionStats(initialSessionStats)` is called (full reset, preset switch with cleared cap), ensure `startedAtMs: Date.now()` and `cardAttempts: {}` are re-initialized. Use a factory `makeInitialSessionStats()` instead of a frozen object literal.

---

## Critical Files

| Path | Change |
|---|---|
| `lib/learning.ts` | +4 constants, +1 type, +1 pure helper |
| `App.tsx` | Extend `SessionStats`, +1 state, +1 effect, modify `handleGrade`, modify `handleReset`/`handleResetLetter`, +inline celebration render block |

No new component files. No new dependencies.

---

## Verification (Bappy, ~5 min before user meeting)

1. **Attempt cap fires.** Temporarily set `SESSION_MAX_ATTEMPTS = 5` in `lib/learning.ts`. Grade 5 cards. Celebration appears. Restore the constant.
2. **Persistence.** With celebration showing, switch to "Letters" tab and back to "Practice". Celebration still showing (loaded from AsyncStorage on mount).
3. **Per-preset isolation.** Switch to a different preset. That preset is playable; the capped one stays celebration-locked.
4. **Card-cap fires.** Temporarily set `CARD_MAX_ATTEMPTS_PER_SESSION = 3`. Pick a near-mastered preset (activeSet shrinks to 1) and tap the same card 3 times. Softer "যথেষ্ট অনুশীলন" copy fires.
5. **Dev reset works.** `__DEV__` "রিসেট (টেস্ট)" button clears `sessionDone` and the AsyncStorage key.
6. **Day rollover.** Manually edit the AsyncStorage value's `dateISO` to yesterday (via the dev reset or temporary log). Re-mount → cap cleared.
7. Restore all constants to their defaults before the meeting.

---

## Future (out of scope, but worth noting)

- Push notification "Come back tomorrow" — defer until after Firebase auth / cloud sync stabilizes.
- Cloud-sync the `sessionCap` state per-user (so the cap follows the user across devices).
- Make limits user-tunable from a Settings screen.
- Replace UTC `dateISO` with explicit local-day rollover if users in different timezones complain.
- Cap-fire analytics (which reason fires most? tune defaults).
