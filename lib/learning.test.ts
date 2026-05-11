import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { LetterCard } from '../data/banglaLetters';
import {
  applyGrade,
  buildCycleQueue,
  chooseNextCard,
  computeGlobalProgress,
  getProgressForCard,
  initSessionState,
  isPresetComplete,
  getUnlockedCards,
  migrateProgress,
  tickCycle,
  CORRECT_PER_LEVEL,
  CYCLES_TO_GROW,
  CYCLE_WRONGS_TO_SHRINK,
  SESSION_MASTERY_LEVEL,
  SPACES_INIT,
  SPACES_MAX,
  SPACES_MIN,
  type LetterProgress,
  type ProgressByCard,
  type SessionState,
} from './learning';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePath(n: number): LetterCard[] {
  const path: LetterCard[] = [];
  for (let i = 0; i < n; i++) {
    path.push({
      id: `card-${i + 1}`,
      letter: String.fromCharCode(0x0985 + i),
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

// Grade a card multiple times
function gradeMany(
  start: ProgressByCard,
  cardId: string,
  outcomes: Array<'c' | 'w'>,
): ProgressByCard {
  return outcomes.reduce(
    (acc, outcome) => applyGrade(acc, cardId, outcome === 'c'),
    start,
  );
}

// ---------------------------------------------------------------------------
// applyGrade — level progression
// ---------------------------------------------------------------------------

test('applyGrade: correct answer increments levelCorrect', () => {
  const p = applyGrade({}, 'card-1', true);
  assert.equal(p['card-1'].levelCorrect, 1);
  assert.equal(p['card-1'].level, 0);
});

test('applyGrade: correct answer increments correctCount and seenCount', () => {
  const p = applyGrade({}, 'card-1', true);
  assert.equal(p['card-1'].correctCount, 1);
  assert.equal(p['card-1'].seenCount, 1);
  assert.equal(p['card-1'].wrongCount, 0);
});

test('applyGrade: wrong answer increments wrongCount and seenCount', () => {
  const p = applyGrade({}, 'card-1', false);
  assert.equal(p['card-1'].wrongCount, 1);
  assert.equal(p['card-1'].seenCount, 1);
  assert.equal(p['card-1'].correctCount, 0);
});

test('applyGrade: after CORRECT_PER_LEVEL correct answers, level advances 0→1 and levelCorrect resets', () => {
  const outcomes: Array<'c'> = Array(CORRECT_PER_LEVEL).fill('c');
  const p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].level, 1);
  assert.equal(p['card-1'].levelCorrect, 0);
});

test('applyGrade: after 2*CORRECT_PER_LEVEL correct answers, level advances to 2 and mastered=true', () => {
  const outcomes: Array<'c'> = Array(CORRECT_PER_LEVEL * 2).fill('c');
  const p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].level, SESSION_MASTERY_LEVEL);
  assert.equal(p['card-1'].mastered, true);
  assert.equal(p['card-1'].levelCorrect, 0);
});

test('applyGrade: wrong answer resets levelCorrect to 0 but does NOT change level', () => {
  // Get to level 1 with 2 correct in that level
  const outcomes: Array<'c' | 'w'> = [
    ...Array(CORRECT_PER_LEVEL).fill('c'), // advance to level 1
    'c', 'c',                              // 2 correct in level 1
    'w',                                   // wrong
  ];
  const p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].level, 1);          // level unchanged
  assert.equal(p['card-1'].levelCorrect, 0);   // reset
});

test('applyGrade: wrong answer sets wrongFlag=true; correct answer sets wrongFlag=false', () => {
  let p = applyGrade({}, 'card-1', false);
  assert.equal(p['card-1'].wrongFlag, true);

  p = applyGrade(p, 'card-1', true);
  assert.equal(p['card-1'].wrongFlag, false);
});

test('applyGrade: mastered is sticky — wrong after mastery does not clear mastered', () => {
  const outcomes: Array<'c'> = Array(CORRECT_PER_LEVEL * 2).fill('c');
  let p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].mastered, true);

  p = applyGrade(p, 'card-1', false);
  assert.equal(p['card-1'].mastered, true);  // still true
});

test('applyGrade: dayHistory grows only once per calendar day', () => {
  // Two correct answers in the same test run — same day
  let p = applyGrade({}, 'card-1', true);
  p = applyGrade(p, 'card-1', true);
  assert.equal(p['card-1'].dayHistory.length, 1);
});

// ---------------------------------------------------------------------------
// buildCycleQueue — ordering rules
// ---------------------------------------------------------------------------

test('buildCycleQueue: result length equals spaces.length', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  const spaces = ['card-1', 'card-2', 'card-3'];
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  assert.equal(queue.length, spaces.length);
});

test('buildCycleQueue: cards with wrongFlag=true appear before cards without', () => {
  const spaces = ['card-1', 'card-2', 'card-3'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), wrongFlag: false },
    'card-2': { ...getProgressForCard({}, 'card-2'), wrongFlag: true },
    'card-3': { ...getProgressForCard({}, 'card-3'), wrongFlag: false },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  // card-2 must be first (only wrongFlag card)
  assert.equal(queue[0], 'card-2');
});

test('buildCycleQueue: anti-repeat — avoids same order as last cycle (3+ cards)', () => {
  const spaces = ['card-1', 'card-2', 'card-3'];
  const progress = defaultProgressFor(spaces);
  // Build first queue
  const first = buildCycleQueue(spaces, progress, [], 0, mulberry32(42));
  // Build second queue with first as history — must differ at least sometimes
  // Run multiple times to confirm anti-repeat logic fires
  let differentFound = false;
  for (let i = 0; i < 10; i++) {
    const second = buildCycleQueue(spaces, progress, [first], 0, mulberry32(i));
    if (second.join(',') !== first.join(',')) {
      differentFound = true;
      break;
    }
  }
  assert.ok(differentFound, 'anti-repeat should produce a different order at least once');
});

// ---------------------------------------------------------------------------
// tickCycle — space lifecycle
// ---------------------------------------------------------------------------

test('tickCycle: after CYCLES_TO_GROW all-correct cycles, a new card enters from waitingPool (Trigger A)', () => {
  const path = makePath(5);
  const progress = defaultProgressFor(path.map((c) => c.id));

  let session = initSessionState(path, progress, mulberry32(1));
  assert.equal(session.spaces.length, SPACES_INIT);
  assert.equal(session.waitingPool.length, 3);

  // Simulate CYCLES_TO_GROW all-correct cycles
  for (let i = 0; i < CYCLES_TO_GROW; i++) {
    session = tickCycle(
      { ...session, currentCycleWrongs: 0, cycleCount: session.cycleCount },
      progress,
      path,
      mulberry32(i + 1),
    );
  }

  assert.equal(session.spaces.length, SPACES_INIT + 1, 'spaces should grow by 1 after Trigger A');
  assert.equal(session.waitingPool.length, 2, 'one card removed from waitingPool');
});

test('tickCycle: if wrong occurred in cycle, cycleCount resets to 0 (no growth)', () => {
  const path = makePath(5);
  const progress = defaultProgressFor(path.map((c) => c.id));
  let session = initSessionState(path, progress, mulberry32(1));

  // Run 2 all-correct cycles first (cycleCount = 2)
  for (let i = 0; i < 2; i++) {
    session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(i));
  }
  assert.equal(session.cycleCount, 2);

  // Run one cycle with a wrong — cycleCount should reset
  session = tickCycle({ ...session, currentCycleWrongs: 1 }, progress, path, mulberry32(99));
  assert.equal(session.cycleCount, 0, 'wrong in cycle resets cycleCount');
  assert.equal(session.spaces.length, SPACES_INIT, 'spaces should not grow');
});

test('tickCycle: card reaching SESSION_MASTERY_LEVEL moves to graduatedPool; next from waitingPool enters (Trigger B)', () => {
  const path = makePath(4);
  const progress = defaultProgressFor(path.map((c) => c.id));

  let session = initSessionState(path, progress, mulberry32(1));
  // Manually mark card-1 as mastered (level >= SESSION_MASTERY_LEVEL)
  const masteredProgress: ProgressByCard = {
    ...progress,
    'card-1': { ...getProgressForCard(progress, 'card-1'), level: SESSION_MASTERY_LEVEL, mastered: true },
  };

  session = tickCycle(
    { ...session, currentCycleWrongs: 0 },
    masteredProgress,
    path,
    mulberry32(1),
  );

  assert.ok(session.graduatedPool.includes('card-1'), 'card-1 should be in graduatedPool');
  assert.ok(!session.spaces.includes('card-1'), 'card-1 should no longer be in spaces');
  assert.equal(session.spaces.length, SPACES_INIT, 'spaces length maintained after backfill');
});

test('tickCycle: shrink — if currentCycleWrongs > CYCLE_WRONGS_TO_SHRINK and spaces > SPACES_MIN, weakest card removed', () => {
  const path = makePath(4);
  const progress = defaultProgressFor(path.map((c) => c.id));

  // Start with 3 spaces (grow first)
  let session = initSessionState(path, progress, mulberry32(1));
  // Force 3 spaces by running CYCLES_TO_GROW all-correct cycles
  for (let i = 0; i < CYCLES_TO_GROW; i++) {
    session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(i));
  }
  assert.equal(session.spaces.length, SPACES_INIT + 1, 'spaces should be 3 before shrink test');

  // Now fire a cycle with wrongs > CYCLE_WRONGS_TO_SHRINK
  const prevSpacesLen = session.spaces.length;
  session = tickCycle(
    { ...session, currentCycleWrongs: CYCLE_WRONGS_TO_SHRINK + 1 },
    progress,
    path,
    mulberry32(99),
  );

  assert.equal(session.spaces.length, prevSpacesLen - 1, 'spaces should shrink by 1');
});

test('tickCycle: after Trigger B graduation backfill, cycleCount resets to 0', () => {
  const path = makePath(4);
  const progress = defaultProgressFor(path.map((c) => c.id));

  let session = initSessionState(path, progress, mulberry32(1));
  // Run 2 all-correct cycles (cycleCount = 2)
  for (let i = 0; i < 2; i++) {
    session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(i));
  }
  assert.equal(session.cycleCount, 2);

  // Mark card-1 as mastered so Trigger B fires
  const masteredProgress: ProgressByCard = {
    ...progress,
    'card-1': { ...getProgressForCard(progress, 'card-1'), level: SESSION_MASTERY_LEVEL, mastered: true },
  };

  session = tickCycle(
    { ...session, currentCycleWrongs: 0 },
    masteredProgress,
    path,
    mulberry32(5),
  );

  assert.equal(session.cycleCount, 0, 'cycleCount should reset after Trigger B backfill');
});

test('tickCycle: cycleIndex resets to 0 after tickCycle', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  let session = initSessionState(path, progress, mulberry32(1));
  // Advance cycleIndex manually
  session = { ...session, cycleIndex: 2 };
  session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(1));
  assert.equal(session.cycleIndex, 0);
});

test('tickCycle: currentCycleWrongs resets to 0 after tickCycle', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  let session = initSessionState(path, progress, mulberry32(1));
  session = { ...session, currentCycleWrongs: 2 };
  session = tickCycle(session, progress, path, mulberry32(1));
  assert.equal(session.currentCycleWrongs, 0);
});

test('tickCycle: currentCycleIndex increments after tickCycle', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  let session = initSessionState(path, progress, mulberry32(1));
  const prevIndex = session.currentCycleIndex;
  session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(1));
  assert.equal(session.currentCycleIndex, prevIndex + 1);
});

// ---------------------------------------------------------------------------
// initSessionState
// ---------------------------------------------------------------------------

test('initSessionState: spaces starts with first SPACES_INIT unmastered cards', () => {
  const path = makePath(5);
  const session = initSessionState(path, {}, mulberry32(1));
  assert.equal(session.spaces.length, SPACES_INIT);
  assert.equal(session.spaces[0], 'card-1');
  assert.equal(session.spaces[1], 'card-2');
});

test('initSessionState: waitingPool contains remaining unmastered cards', () => {
  const path = makePath(5);
  const session = initSessionState(path, {}, mulberry32(1));
  assert.equal(session.waitingPool.length, 3); // 5 - SPACES_INIT(2) = 3
  assert.equal(session.waitingPool[0], 'card-3');
  assert.equal(session.waitingPool[1], 'card-4');
  assert.equal(session.waitingPool[2], 'card-5');
});

test('initSessionState: graduatedPool contains already-mastered cards', () => {
  const path = makePath(4);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true, level: SESSION_MASTERY_LEVEL },
  };
  const session = initSessionState(path, progress, mulberry32(1));
  assert.ok(session.graduatedPool.includes('card-1'));
  assert.ok(session.graduatedPool.includes('card-2'));
  assert.equal(session.graduatedPool.length, 2);
});

test('initSessionState: cycleQueue has exactly SPACES_INIT entries', () => {
  const path = makePath(5);
  const session = initSessionState(path, {}, mulberry32(1));
  assert.equal(session.cycleQueue.length, SPACES_INIT);
});

test('initSessionState: cycleIndex=0, cycleCount=0, currentCycleIndex=0', () => {
  const path = makePath(3);
  const session = initSessionState(path, {}, mulberry32(1));
  assert.equal(session.cycleIndex, 0);
  assert.equal(session.cycleCount, 0);
  assert.equal(session.currentCycleIndex, 0);
});

// ---------------------------------------------------------------------------
// chooseNextCard
// ---------------------------------------------------------------------------

test('chooseNextCard: returns card at session.cycleQueue[session.cycleIndex]', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  const session = initSessionState(path, progress, mulberry32(1));

  const expectedId = session.cycleQueue[session.cycleIndex];
  const chosen = chooseNextCard(path, progress, '', session, mulberry32(1));
  assert.equal(chosen.id, expectedId);
});

test('chooseNextCard: falls back gracefully when cycleQueue is empty — returns unmastered card', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  const session: SessionState = {
    ...initSessionState(path, progress, mulberry32(1)),
    cycleQueue: [],
    cycleIndex: 0,
  };
  const chosen = chooseNextCard(path, progress, '', session, mulberry32(1));
  // Should return some unmastered card, not throw
  assert.ok(path.some((c) => c.id === chosen.id));
});

test('chooseNextCard: no session provided — returns a valid card from the path', () => {
  const path = makePath(4);
  const progress = defaultProgressFor(path.map((c) => c.id));
  const chosen = chooseNextCard(path, progress, '', undefined, mulberry32(7));
  assert.ok(path.some((c) => c.id === chosen.id));
});

// ---------------------------------------------------------------------------
// computeGlobalProgress
// ---------------------------------------------------------------------------

test('computeGlobalProgress: 0% when no correct answers', () => {
  const path = makePath(3);
  const result = computeGlobalProgress({}, path);
  assert.equal(result.percent, 0);
  assert.equal(result.earned, 0);
});

test('computeGlobalProgress: 100% when all cards have earned PER_LETTER_EFFECTIVE_MAX points', () => {
  // PER_LETTER_EFFECTIVE_MAX = SESSION_MASTERY_LEVEL * CORRECT_PER_LEVEL = 2 * 5 = 10
  // A card at level=SESSION_MASTERY_LEVEL (2), levelCorrect=0 earns 2*5+0 = 10 = PER_LETTER_EFFECTIVE_MAX.
  const path = makePath(3);
  const progress: ProgressByCard = {};
  for (const card of path) {
    progress[card.id] = {
      ...getProgressForCard({}, card.id),
      level: SESSION_MASTERY_LEVEL, // level 2 → earns 10 = PER_LETTER_EFFECTIVE_MAX
      levelCorrect: 0,
      mastered: true,
    };
  }
  const result = computeGlobalProgress(progress, path);
  assert.equal(result.percent, 100);
});

test('computeGlobalProgress: mid-session partial calculation', () => {
  // PER_LETTER_EFFECTIVE_MAX = SESSION_MASTERY_LEVEL * CORRECT_PER_LEVEL = 2 * 5 = 10
  // 1 card at level=1, levelCorrect=2 → earned = 1*5 + 2 = 7
  // 1 card at level=0, levelCorrect=0 → earned = 0
  // max = 2 * 10 = 20
  // percent = round(7/20 * 100) = round(35) = 35
  const path = makePath(2);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 1, levelCorrect: 2 },
    'card-2': { ...getProgressForCard({}, 'card-2'), level: 0, levelCorrect: 0 },
  };
  const result = computeGlobalProgress(progress, path);
  assert.equal(result.earned, 7);
  assert.equal(result.max, 20);
  assert.equal(result.percent, 35);
});

test('computeGlobalProgress: never exceeds 100%', () => {
  const path = makePath(2);
  const progress: ProgressByCard = {};
  // Force absurdly high level values
  for (const card of path) {
    progress[card.id] = { ...getProgressForCard({}, card.id), level: 99, levelCorrect: 99 };
  }
  const result = computeGlobalProgress(progress, path);
  assert.ok(result.percent <= 100);
});

// ---------------------------------------------------------------------------
// migrateProgress
// ---------------------------------------------------------------------------

test('migrateProgress: null → { schemaVersion: 4, byCard: {} }', () => {
  const out = migrateProgress(null);
  assert.equal(out.schemaVersion, 4);
  assert.deepEqual(out.byCard, {});
});

test('migrateProgress: undefined → { schemaVersion: 4, byCard: {} }', () => {
  const out = migrateProgress(undefined);
  assert.equal(out.schemaVersion, 4);
  assert.deepEqual(out.byCard, {});
});

test('migrateProgress: v4 input passes through with missing fields filled from defaults', () => {
  const v4 = {
    schemaVersion: 4 as const,
    byCard: {
      'card-x': {
        correctCount: 3,
        wrongCount: 1,
        seenCount: 4,
        mastered: false,
        lastSeenAt: '2026-05-11T10:00:00.000Z',
        firstSeenAt: '2026-05-11T09:00:00.000Z',
        dayHistory: ['2026-05-11'],
        level: 0,
        levelCorrect: 3,
        wrongFlag: false,
        lastShownCycleIndex: 2,
      },
    },
  };
  const out = migrateProgress(v4);
  assert.equal(out.schemaVersion, 4);
  assert.equal(out.byCard['card-x'].correctCount, 3);
  assert.equal(out.byCard['card-x'].level, 0);
  assert.equal(out.byCard['card-x'].levelCorrect, 3);
});

test('migrateProgress: v3 mastered card → level=SESSION_MASTERY_LEVEL, schemaVersion=4', () => {
  const v3 = {
    schemaVersion: 3 as const,
    byCard: {
      'card-a': {
        correctCount: 15,
        wrongCount: 2,
        seenCount: 17,
        mastered: true,
        lastSeenAt: '2026-05-10T12:00:00.000Z',
        firstSeenAt: '2026-05-09T12:00:00.000Z',
        dayHistory: ['2026-05-09', '2026-05-10'],
        streak: 10,
      },
    },
  };
  const out = migrateProgress(v3);
  assert.equal(out.schemaVersion, 4);
  assert.equal(out.byCard['card-a'].level, SESSION_MASTERY_LEVEL);
  assert.equal(out.byCard['card-a'].mastered, true);
  assert.equal(out.byCard['card-a'].wrongFlag, false);
});

test('migrateProgress: v3 non-mastered with correctCount >= CORRECT_PER_LEVEL → level 1', () => {
  const v3 = {
    schemaVersion: 3 as const,
    byCard: {
      'card-b': {
        correctCount: CORRECT_PER_LEVEL + 2, // past level 0 threshold
        wrongCount: 1,
        seenCount: CORRECT_PER_LEVEL + 3,
        mastered: false,
        lastSeenAt: null,
        firstSeenAt: null,
        dayHistory: [],
        streak: 3,
      },
    },
  };
  const out = migrateProgress(v3);
  assert.equal(out.schemaVersion, 4);
  assert.equal(out.byCard['card-b'].level, 1);
  assert.equal(out.byCard['card-b'].mastered, false);
});

test('migrateProgress: v3 non-mastered with correctCount < CORRECT_PER_LEVEL → level 0', () => {
  const v3 = {
    schemaVersion: 3 as const,
    byCard: {
      'card-c': {
        correctCount: 2,
        wrongCount: 0,
        seenCount: 2,
        mastered: false,
        lastSeenAt: null,
        firstSeenAt: null,
        dayHistory: [],
        streak: 0,
      },
    },
  };
  const out = migrateProgress(v3);
  assert.equal(out.schemaVersion, 4);
  assert.equal(out.byCard['card-c'].level, 0);
  assert.equal(out.byCard['card-c'].levelCorrect, 2);
});

// ---------------------------------------------------------------------------
// isPresetComplete
// ---------------------------------------------------------------------------

test('isPresetComplete: false when any card is unmastered', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true },
    // card-3 not mastered
  };
  assert.equal(isPresetComplete(path, progress), false);
});

test('isPresetComplete: false when progress is empty', () => {
  const path = makePath(2);
  assert.equal(isPresetComplete(path, {}), false);
});

test('isPresetComplete: true when all cards have mastered=true', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true },
    'card-3': { ...getProgressForCard({}, 'card-3'), mastered: true },
  };
  assert.equal(isPresetComplete(path, progress), true);
});

// ---------------------------------------------------------------------------
// getUnlockedCards
// ---------------------------------------------------------------------------

test('getUnlockedCards: returns only unmastered cards when some are unmastered', () => {
  const path = makePath(4);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true },
  };
  const unlocked = getUnlockedCards(path, progress);
  assert.equal(unlocked.length, 2);
  assert.ok(unlocked.every((c) => c.id === 'card-3' || c.id === 'card-4'));
});

test('getUnlockedCards: returns ALL cards when all are mastered', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true },
    'card-3': { ...getProgressForCard({}, 'card-3'), mastered: true },
  };
  const unlocked = getUnlockedCards(path, progress);
  assert.equal(unlocked.length, 3);
});

test('getUnlockedCards: returns all cards when progress is empty (none mastered)', () => {
  const path = makePath(3);
  const unlocked = getUnlockedCards(path, {});
  assert.equal(unlocked.length, 3);
});
