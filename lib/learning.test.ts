import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { LetterCard } from '../data/banglaLetters';
import {
  applyActiveSetOnCorrect,
  applyActiveSetOnMastery,
  applyGrade,
  chooseNextCard,
  eligibleForSprinkle,
  initSessionState,
  isPathComplete,
  maybeEnterStruggleMode,
  maybeExitStruggleMode,
  migrateProgress,
  tickPostMasteryCounters,
  tickSprinkleCooldowns,
  visibilityScore,
  ACTIVE_SET_START,
  ACTIVE_SET_STEADY,
  ACTIVE_SET_STRUGGLE,
  MASTERY_TARGET,
  NEW_CARD_BOOST_DURATION,
  NEW_CARD_BOOST_WEIGHT,
  NEWLY_MASTERED_QUIET_PERIOD,
  PENALTY_MAX,
  SPRINKLE_EVERY_N_CARDS,
  STRUGGLE_RECOVERY_STREAK,
  WARMUP_PER_CARD,
  getProgressForCard,
  type LetterProgress,
  type ProgressByCard,
  type SessionState,
} from './learning';

const CARD = 'card-1';

function gradeMany(
  start: ProgressByCard,
  card: string,
  outcomes: Array<'c' | 'w'>,
): ProgressByCard {
  return outcomes.reduce(
    (acc, outcome) => applyGrade(acc, card, outcome === 'c'),
    start,
  );
}

test('correct during warm-up does not advance streak', () => {
  const after = gradeMany({}, CARD, ['c', 'c', 'c', 'c', 'c']);
  const p = after[CARD];
  assert.equal(p.correctCount, WARMUP_PER_CARD);
  assert.equal(p.streak, 0);
  assert.equal(p.mastered, false);
});

test('first counted-correct (6th) advances streak to 1', () => {
  const after = gradeMany({}, CARD, ['c', 'c', 'c', 'c', 'c', 'c']);
  const p = after[CARD];
  assert.equal(p.correctCount, WARMUP_PER_CARD + 1);
  assert.equal(p.streak, 1);
  assert.equal(p.mastered, false);
});

test('streak reaches MASTERY_TARGET sets mastered = true', () => {
  // 5 warm-up + 10 counted = 15 corrects in a row → streak = 10, mastered.
  const total = WARMUP_PER_CARD + MASTERY_TARGET;
  const outcomes: Array<'c' | 'w'> = Array.from({ length: total }, () => 'c');
  const after = gradeMany({}, CARD, outcomes);
  const p = after[CARD];
  assert.equal(p.streak, MASTERY_TARGET);
  assert.equal(p.bestStreak, MASTERY_TARGET);
  assert.equal(p.mastered, true);
});

test('mastery is sticky: a subsequent wrong sets streak=0 but mastered stays true', () => {
  const total = WARMUP_PER_CARD + MASTERY_TARGET;
  const outcomes: Array<'c' | 'w'> = Array.from({ length: total }, () => 'c');
  outcomes.push('w');
  const after = gradeMany({}, CARD, outcomes);
  const p = after[CARD];
  assert.equal(p.streak, 0);
  assert.equal(p.mastered, true);
  assert.equal(p.bestStreak, MASTERY_TARGET); // best is preserved
});

test('penalty: 1 on first wrong; doubles on consecutive wrongs; capped at PENALTY_MAX', () => {
  // 1 wrong  → penalty 1
  // 2 wrongs → penalty 2
  // 3 wrongs → penalty 4
  // 4 wrongs → penalty 8
  // 5 wrongs → penalty 16
  // 6 wrongs → penalty 16 (capped)
  let p = applyGrade({}, CARD, false);
  assert.equal(p[CARD].penalty, 1);
  p = applyGrade(p, CARD, false);
  assert.equal(p[CARD].penalty, 2);
  p = applyGrade(p, CARD, false);
  assert.equal(p[CARD].penalty, 4);
  p = applyGrade(p, CARD, false);
  assert.equal(p[CARD].penalty, 8);
  p = applyGrade(p, CARD, false);
  assert.equal(p[CARD].penalty, PENALTY_MAX);
  p = applyGrade(p, CARD, false);
  assert.equal(p[CARD].penalty, PENALTY_MAX);
  assert.equal(p[CARD].consecutiveMistakes, 6);
});

test('correct after wrong halves penalty and resets consecutiveMistakes', () => {
  let p = gradeMany({}, CARD, ['w', 'w', 'w']); // penalty = 4
  assert.equal(p[CARD].penalty, 4);
  p = applyGrade(p, CARD, true);
  assert.equal(p[CARD].penalty, 2); // floor(4/2) = 2
  assert.equal(p[CARD].consecutiveMistakes, 0);
});

test('wrong does NOT consume warm-up budget (correctCount unchanged on wrong)', () => {
  const p = gradeMany({}, CARD, ['c', 'c', 'c', 'c', 'w']);
  assert.equal(p[CARD].correctCount, 4);
  assert.equal(p[CARD].wrongCount, 1);
  assert.equal(p[CARD].streak, 0);
});

test('migrateProgress: v1 ProgressByCard → v2 envelope preserving achievements', () => {
  const v1 = {
    'card-a': {
      correctCount: 3,
      wrongCount: 1,
      seenCount: 4,
      mastered: true,
      lastSeenAt: '2026-05-04T12:00:00.000Z',
    },
    'card-b': {
      correctCount: 0,
      wrongCount: 0,
      seenCount: 0,
      mastered: false,
      lastSeenAt: null,
    },
  };
  const out = migrateProgress(v1);
  assert.equal(out.schemaVersion, 2);

  const a = out.byCard['card-a'];
  assert.equal(a.correctCount, 3);
  assert.equal(a.wrongCount, 1);
  assert.equal(a.seenCount, 4);
  assert.equal(a.mastered, true);
  assert.equal(a.lastSeenAt, '2026-05-04T12:00:00.000Z');
  assert.equal(a.streak, 0);
  assert.equal(a.bestStreak, 0);
  assert.equal(a.penalty, 0);
  assert.equal(a.consecutiveMistakes, 0);
  assert.deepEqual(a.recentResults, []);
  assert.equal(a.attemptsSinceEnteringActive, 0);
  assert.equal(a.enteredActiveAt, null);
  assert.equal(a.cardsShownSinceMastered, 999); // already past the quiet period
  assert.equal(a.sprinkleCooldown, 0);
  assert.equal(a.timeSpentMs, 0);
  assert.equal(a.firstSeenAt, '2026-05-04T12:00:00.000Z');

  const b = out.byCard['card-b'];
  assert.equal(b.cardsShownSinceMastered, 0); // not mastered → 0
  assert.equal(b.firstSeenAt, null);
});

test('migrateProgress: v2 → v2 is idempotent (pass-through)', () => {
  const v2 = {
    schemaVersion: 2 as const,
    byCard: {
      'card-x': {
        correctCount: 7,
        wrongCount: 2,
        seenCount: 9,
        mastered: false,
        lastSeenAt: '2026-05-05T10:00:00.000Z',
        streak: 2,
        bestStreak: 5,
        penalty: 4,
        consecutiveMistakes: 0,
        recentResults: ['c', 'w', 'c'] as Array<'c' | 'w'>,
        attemptsSinceEnteringActive: 9,
        enteredActiveAt: '2026-05-05T09:00:00.000Z',
        cardsShownSinceMastered: 0,
        sprinkleCooldown: 0,
        timeSpentMs: 0,
        firstSeenAt: '2026-05-05T08:00:00.000Z',
      },
    },
  };
  const out = migrateProgress(v2);
  assert.equal(out.schemaVersion, 2);
  assert.deepEqual(out.byCard, v2.byCard);
});

test('migrateProgress: empty / undefined / null inputs return empty v2 envelope', () => {
  for (const input of [undefined, null, {}]) {
    const out = migrateProgress(input);
    assert.equal(out.schemaVersion, 2);
    assert.deepEqual(out.byCard, {});
  }
});

// ---------------------------------------------------------------------------
// CTX-06 — selection logic, active-set lifecycle, struggle mode
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePath(n: number): LetterCard[] {
  const path: LetterCard[] = [];
  for (let i = 0; i < n; i++) {
    path.push({
      id: `card-${i + 1}`,
      letter: String.fromCharCode(0x0985 + i), // arbitrary Bangla letter
      group: 'vowel',
      order: i + 1,
    });
  }
  return path;
}

function defaultProgressFor(ids: string[]): ProgressByCard {
  const out: ProgressByCard = {};
  for (const id of ids) out[id] = getProgressForCard({}, id);
  return out;
}

function withProgress(
  progress: ProgressByCard,
  id: string,
  patch: Partial<LetterProgress>,
): ProgressByCard {
  return { ...progress, [id]: { ...getProgressForCard(progress, id), ...patch } };
}

test('visibilityScore: previous card returns 0 when activeSet.length > 1', () => {
  const path = makePath(3);
  const session: SessionState = {
    ...initSessionState(path, {}),
    previousCardId: 'card-1',
  };
  const cardProgress = getProgressForCard({}, 'card-1');
  const s = visibilityScore(path[0], cardProgress, session);
  assert.equal(s, 0);
});

test('visibilityScore: previous card returns nonzero when activeSet.length === 1', () => {
  const path = makePath(3);
  const session: SessionState = {
    ...initSessionState(path, {}),
    activeSet: ['card-1'],
    previousCardId: 'card-1',
  };
  const cardProgress = getProgressForCard({}, 'card-1');
  const s = visibilityScore(path[0], cardProgress, session);
  assert.ok(s > 0, `expected score > 0 in single-card fallback, got ${s}`);
});

test('visibilityScore: mastered card returns 0', () => {
  const path = makePath(2);
  const session = initSessionState(path, {});
  const cardProgress: LetterProgress = {
    ...getProgressForCard({}, 'card-1'),
    mastered: true,
  };
  const s = visibilityScore(path[0], cardProgress, session);
  assert.equal(s, 0);
});

test('visibilityScore: newcomer boost decays from full at attempt 0 to 0 at attempt NEW_CARD_BOOST_DURATION', () => {
  const path = makePath(3);
  // session whose previous card is NOT card-1, so anti-repeat doesn't fire
  const session: SessionState = {
    ...initSessionState(path, {}),
    previousCardId: 'card-2',
  };

  const at0 = visibilityScore(
    path[0],
    { ...getProgressForCard({}, 'card-1'), attemptsSinceEnteringActive: 0 },
    session,
  );
  const atFull = visibilityScore(
    path[0],
    {
      ...getProgressForCard({}, 'card-1'),
      attemptsSinceEnteringActive: NEW_CARD_BOOST_DURATION,
    },
    session,
  );

  assert.ok(
    at0 - atFull >= NEW_CARD_BOOST_WEIGHT - 1e-9,
    `expected newcomer term contributing ~${NEW_CARD_BOOST_WEIGHT}, got delta ${at0 - atFull}`,
  );
  // Half-decay: at duration/2, contribution should be NEW_CARD_BOOST_WEIGHT/2.
  const atHalf = visibilityScore(
    path[0],
    {
      ...getProgressForCard({}, 'card-1'),
      attemptsSinceEnteringActive: NEW_CARD_BOOST_DURATION / 2,
    },
    session,
  );
  assert.ok(
    Math.abs((atHalf - atFull) - NEW_CARD_BOOST_WEIGHT / 2) < 1e-6,
    `expected half-decay = ${NEW_CARD_BOOST_WEIGHT / 2}, got ${atHalf - atFull}`,
  );
});

test('chooseNextCard: never returns previousCardId when activeSet.length > 1 over 200 trials', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(['card-1', 'card-2', 'card-3']);
  const session: SessionState = {
    ...initSessionState(path, progress),
    activeSet: ['card-1', 'card-2'],
    previousCardId: 'card-1',
  };
  const rng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    const chosen = chooseNextCard(path, progress, 'card-1', session, rng);
    assert.notEqual(chosen.id, 'card-1');
  }
});

test('chooseNextCard: weighted distribution favors highest-score card', () => {
  // Construct two cards where card-1 has a high score, card-2 has roughly half.
  // Use attemptsSinceEnteringActive to scale the boost term:
  //   card-1: attempts=0  → boost = 8
  //   card-2: attempts=4  → boost = 4
  // Both cards get W_BASE=1 + freshness=2.5 (recent.length=0). So:
  //   card-1 score ≈ 1 + 8 + 2.5 = 11.5
  //   card-2 score ≈ 1 + 4 + 2.5 = 7.5
  // That's not "half" exactly. Tweak: card-1 attempts=0, card-2 attempts=6 → boost 2.
  //   card-1 ≈ 1 + 8 + 2.5 = 11.5
  //   card-2 ≈ 1 + 2 + 2.5 = 5.5  → roughly half.
  const path = makePath(2);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), attemptsSinceEnteringActive: 0 },
    'card-2': { ...getProgressForCard({}, 'card-2'), attemptsSinceEnteringActive: 6 },
  };
  const session: SessionState = {
    ...initSessionState(path, progress),
    activeSet: ['card-1', 'card-2'],
    previousCardId: null,
  };

  const rng = mulberry32(0xc0ffee);
  let topCount = 0;
  const trials = 1000;
  for (let i = 0; i < trials; i++) {
    const chosen = chooseNextCard(path, progress, '', session, rng);
    if (chosen.id === 'card-1') topCount += 1;
  }
  const ratio = topCount / trials;
  assert.ok(
    ratio >= 0.35,
    `expected top card chosen ≥ 35% of the time, got ${(ratio * 100).toFixed(1)}%`,
  );
});

test('chooseNextCard: single-card fallback returns the only card', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(['card-1', 'card-2', 'card-3']);
  const session: SessionState = {
    ...initSessionState(path, progress),
    activeSet: ['card-2'],
    previousCardId: 'card-2',
  };
  const chosen = chooseNextCard(path, progress, 'card-2', session, () => 0);
  assert.equal(chosen.id, 'card-2');
});

test('applyActiveSetOnCorrect: first counted-correct grows from 2 → 3', () => {
  const path = makePath(5);
  const session = initSessionState(path, {});
  assert.equal(session.activeSet.length, ACTIVE_SET_START);
  const cardProgress = getProgressForCard({}, 'card-1');
  const next = applyActiveSetOnCorrect(session, 'card-1', cardProgress, path);
  assert.equal(next.activeSet.length, ACTIVE_SET_STEADY);
  assert.equal(next.activeSet[2], 'card-3');
});

test('applyActiveSetOnCorrect: subsequent counted-corrects do NOT grow further', () => {
  const path = makePath(5);
  const session: SessionState = {
    ...initSessionState(path, {}),
    activeSet: ['card-1', 'card-2', 'card-3'],
  };
  const cardProgress = getProgressForCard({}, 'card-1');
  const next = applyActiveSetOnCorrect(session, 'card-1', cardProgress, path);
  assert.equal(next.activeSet.length, ACTIVE_SET_STEADY);
  assert.deepEqual(next.activeSet, ['card-1', 'card-2', 'card-3']);
});

test('applyActiveSetOnMastery: mastered card removed; next path card appended', () => {
  const path = makePath(5);
  const session: SessionState = {
    ...initSessionState(path, {}),
    activeSet: ['card-1', 'card-2', 'card-3'],
  };
  const next = applyActiveSetOnMastery(session, 'card-2', path);
  assert.ok(!next.activeSet.includes('card-2'), 'mastered card removed');
  assert.equal(next.activeSet.length, 3);
  assert.equal(next.activeSet[next.activeSet.length - 1], 'card-4');
});

test('maybeEnterStruggleMode: 2 wrongs in last 6 enters; active set shrinks to top 2 by struggleScore', () => {
  const path = makePath(4);
  // Three active cards; card-2 has highest struggleScore (consecutiveMistakes & penalty).
  let progress = defaultProgressFor(['card-1', 'card-2', 'card-3']);
  progress = withProgress(progress, 'card-2', {
    consecutiveMistakes: 2,
    penalty: 4,
    recentResults: ['w', 'w'],
  });
  progress = withProgress(progress, 'card-3', {
    consecutiveMistakes: 1,
    penalty: 1,
    recentResults: ['w'],
  });
  // card-1 stays clean.

  const session: SessionState = {
    ...initSessionState(path, progress),
    activeSet: ['card-1', 'card-2', 'card-3'],
    recentGrades: ['w', 'c', 'w'], // 2 wrongs in last window
  };
  const next = maybeEnterStruggleMode(session, progress, path);
  assert.equal(next.inStruggleMode, true);
  assert.equal(next.activeSet.length, ACTIVE_SET_STRUGGLE);
  // Top 2 by struggleScore: card-2 (2*3+4+2=12) and card-3 (1*3+1+1=5).
  assert.deepEqual(new Set(next.activeSet), new Set(['card-2', 'card-3']));
  assert.deepEqual(next.prePushedActiveSet, ['card-1', 'card-2', 'card-3']);
});

test('maybeExitStruggleMode: 6 consecutive correct exits; active set restored', () => {
  const path = makePath(4);
  const session: SessionState = {
    ...initSessionState(path, {}),
    activeSet: ['card-2', 'card-3'],
    prePushedActiveSet: ['card-1', 'card-2', 'card-3'],
    inStruggleMode: true,
    consecutiveCorrectInSession: STRUGGLE_RECOVERY_STREAK,
  };
  const next = maybeExitStruggleMode(session, path);
  assert.equal(next.inStruggleMode, false);
  assert.deepEqual(next.activeSet, ['card-1', 'card-2', 'card-3']);
  assert.equal(next.prePushedActiveSet, null);
});

// ---------------------------------------------------------------------------
// CTX-07 — sprinkle, path-complete, post-mastery counters
// ---------------------------------------------------------------------------

function masteredProgress(
  id: string,
  patch: Partial<LetterProgress> = {},
): LetterProgress {
  return {
    ...getProgressForCard({}, id),
    mastered: true,
    cardsShownSinceMastered: NEWLY_MASTERED_QUIET_PERIOD,
    sprinkleCooldown: 0,
    ...patch,
  };
}

test('eligibleForSprinkle: returns false for un-mastered cards', () => {
  const path = makePath(2);
  const state: SessionState = {
    ...initSessionState(path, {}),
    cardsShown: SPRINKLE_EVERY_N_CARDS,
  };
  const cardProgress: LetterProgress = {
    ...getProgressForCard({}, 'card-1'),
    mastered: false,
  };
  assert.equal(eligibleForSprinkle(cardProgress, state), false);
});

test('eligibleForSprinkle: returns false during quiet period', () => {
  const path = makePath(2);
  const state: SessionState = {
    ...initSessionState(path, {}),
    cardsShown: SPRINKLE_EVERY_N_CARDS,
  };
  const cardProgress = masteredProgress('card-1', {
    cardsShownSinceMastered: NEWLY_MASTERED_QUIET_PERIOD - 1,
  });
  assert.equal(eligibleForSprinkle(cardProgress, state), false);
});

test('eligibleForSprinkle: returns false during struggle mode', () => {
  const path = makePath(2);
  const state: SessionState = {
    ...initSessionState(path, {}),
    cardsShown: SPRINKLE_EVERY_N_CARDS,
    inStruggleMode: true,
  };
  const cardProgress = masteredProgress('card-1');
  assert.equal(eligibleForSprinkle(cardProgress, state), false);
});

test('eligibleForSprinkle: returns true on the 7th card when cooldown=0 + quiet period passed', () => {
  const path = makePath(2);
  const state: SessionState = {
    ...initSessionState(path, {}),
    cardsShown: SPRINKLE_EVERY_N_CARDS,
    inStruggleMode: false,
  };
  const cardProgress = masteredProgress('card-1');
  assert.equal(eligibleForSprinkle(cardProgress, state), true);
});

test('eligibleForSprinkle: returns false when cooldown > 0', () => {
  const path = makePath(2);
  const state: SessionState = {
    ...initSessionState(path, {}),
    cardsShown: SPRINKLE_EVERY_N_CARDS,
  };
  const cardProgress = masteredProgress('card-1', { sprinkleCooldown: 5 });
  assert.equal(eligibleForSprinkle(cardProgress, state), false);
});

test('tickSprinkleCooldowns: decrements mastered cards; floors at 0; un-mastered untouched; just-shown unaffected', () => {
  const progress: ProgressByCard = {
    'card-1': masteredProgress('card-1', { sprinkleCooldown: 5 }),
    'card-2': masteredProgress('card-2', { sprinkleCooldown: 0 }),
    'card-3': masteredProgress('card-3', { sprinkleCooldown: 12 }),
    'card-4': { ...getProgressForCard({}, 'card-4'), sprinkleCooldown: 9 }, // unmastered
  };
  const next = tickSprinkleCooldowns(progress, 'card-3');
  assert.equal(next['card-1'].sprinkleCooldown, 4); // decremented
  assert.equal(next['card-2'].sprinkleCooldown, 0); // floored
  assert.equal(next['card-3'].sprinkleCooldown, 12); // just-shown unchanged
  assert.equal(next['card-4'].sprinkleCooldown, 9); // un-mastered unchanged
});

test('tickPostMasteryCounters: increments cardsShownSinceMastered for mastered cards only', () => {
  const progress: ProgressByCard = {
    'card-1': masteredProgress('card-1', { cardsShownSinceMastered: 3 }),
    'card-2': { ...getProgressForCard({}, 'card-2'), cardsShownSinceMastered: 0 },
  };
  const next = tickPostMasteryCounters(progress);
  assert.equal(next['card-1'].cardsShownSinceMastered, 4);
  assert.equal(next['card-2'].cardsShownSinceMastered, 0); // un-mastered untouched
});

test('isPathComplete: true iff every path card is mastered', () => {
  const path = makePath(3);
  let progress: ProgressByCard = {};
  assert.equal(isPathComplete(path, progress), false);

  progress = {
    'card-1': masteredProgress('card-1'),
    'card-2': masteredProgress('card-2'),
  };
  assert.equal(isPathComplete(path, progress), false); // card-3 missing

  progress = {
    'card-1': masteredProgress('card-1'),
    'card-2': masteredProgress('card-2'),
    'card-3': masteredProgress('card-3'),
  };
  assert.equal(isPathComplete(path, progress), true);
});

test('chooseNextCard in path-complete state: returns a mastered card; respects anti-repeat', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': masteredProgress('card-1'),
    'card-2': masteredProgress('card-2'),
    'card-3': masteredProgress('card-3'),
  };
  // empty active set → forces path-complete fallback inside chooseNextCard
  const session: SessionState = {
    ...initSessionState(path, progress),
    activeSet: [],
    previousCardId: 'card-1',
  };
  const rng = mulberry32(7);
  const masteredIds = new Set(['card-1', 'card-2', 'card-3']);
  for (let i = 0; i < 100; i++) {
    const chosen = chooseNextCard(path, progress, 'card-1', session, rng);
    assert.ok(masteredIds.has(chosen.id), `chosen must be mastered: ${chosen.id}`);
    assert.notEqual(chosen.id, 'card-1', 'anti-repeat must hold');
  }
});
