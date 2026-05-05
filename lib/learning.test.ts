import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyGrade,
  migrateProgress,
  MASTERY_TARGET,
  PENALTY_MAX,
  WARMUP_PER_CARD,
  type ProgressByCard,
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
