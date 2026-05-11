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
  PHASE_THRESHOLDS,
  PHASE_CUMULATIVE,
  TOTAL_CORRECT_TO_MASTER,
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
// applyGrade — basic counters
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

// ---------------------------------------------------------------------------
// applyGrade — Phase 1 (level 0→1): 5 total correct, no streak penalty
// ---------------------------------------------------------------------------

test('applyGrade Phase 1: after 5 correct answers, level advances 0→1 and levelCorrect resets', () => {
  const outcomes: Array<'c'> = Array(PHASE_THRESHOLDS[0]).fill('c');
  const p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].level, 1);
  assert.equal(p['card-1'].levelCorrect, 0);
});

test('applyGrade Phase 1: wrong does NOT reset levelCorrect (free phase)', () => {
  // 3 correct, then wrong, levelCorrect should still be 3
  const outcomes: Array<'c' | 'w'> = ['c', 'c', 'c', 'w'];
  const p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].level, 0);
  assert.equal(p['card-1'].levelCorrect, 3);
});

test('applyGrade Phase 1: wrongs interleaved — still advances on 5th correct', () => {
  // 2 correct, wrong, 3 more correct → 5 total correct → level 1
  const outcomes: Array<'c' | 'w'> = ['c', 'c', 'w', 'c', 'c', 'c'];
  const p = gradeMany({}, 'card-1', outcomes);
  assert.equal(p['card-1'].level, 1);
  assert.equal(p['card-1'].levelCorrect, 0);
});

test('applyGrade Phase 1: wrong sets wrongFlag=true, correct clears it', () => {
  let p = applyGrade({}, 'card-1', false);
  assert.equal(p['card-1'].wrongFlag, true);
  p = applyGrade(p, 'card-1', true);
  assert.equal(p['card-1'].wrongFlag, false);
});

// ---------------------------------------------------------------------------
// applyGrade — Phase 2 (level 1→2): 10 consecutive correct, wrong resets
// ---------------------------------------------------------------------------

test('applyGrade Phase 2: reaches level 2 after 10 consecutive correct in phase 2', () => {
  // First complete phase 1 (5 correct)
  const phase1: Array<'c'> = Array(PHASE_THRESHOLDS[0]).fill('c');
  // Then do 10 consecutive correct for phase 2
  const phase2: Array<'c'> = Array(PHASE_THRESHOLDS[1]).fill('c');
  const p = gradeMany({}, 'card-1', [...phase1, ...phase2]);
  assert.equal(p['card-1'].level, 2);
  assert.equal(p['card-1'].levelCorrect, 0);
});

test('applyGrade Phase 2: wrong DOES reset levelCorrect (streak required)', () => {
  // Complete phase 1
  const phase1: Array<'c'> = Array(PHASE_THRESHOLDS[0]).fill('c');
  // Do 7 correct in phase 2, then wrong — should reset to 0
  const phase2partial: Array<'c' | 'w'> = [...Array(7).fill('c'), 'w'];
  const p = gradeMany({}, 'card-1', [...phase1, ...phase2partial]);
  assert.equal(p['card-1'].level, 1);
  assert.equal(p['card-1'].levelCorrect, 0);
});

// ---------------------------------------------------------------------------
// applyGrade — Phase 3 (level 2→3/mastered): 5 consecutive correct
// ---------------------------------------------------------------------------

test('applyGrade Phase 3: full mastery after completing all 3 phases (5+10+5=20 correct)', () => {
  const phase1: Array<'c'> = Array(PHASE_THRESHOLDS[0]).fill('c');
  const phase2: Array<'c'> = Array(PHASE_THRESHOLDS[1]).fill('c');
  const phase3: Array<'c'> = Array(PHASE_THRESHOLDS[2]).fill('c');
  const p = gradeMany({}, 'card-1', [...phase1, ...phase2, ...phase3]);
  assert.equal(p['card-1'].level, SESSION_MASTERY_LEVEL);
  assert.equal(p['card-1'].mastered, true);
  assert.equal(p['card-1'].levelCorrect, 0);
});

test('applyGrade Phase 3: wrong resets streak; must hit 5 consecutive again', () => {
  const phase1: Array<'c'> = Array(PHASE_THRESHOLDS[0]).fill('c');
  const phase2: Array<'c'> = Array(PHASE_THRESHOLDS[1]).fill('c');
  // Phase 3: 3 correct, wrong, then back to 0
  const phase3partial: Array<'c' | 'w'> = ['c', 'c', 'c', 'w'];
  const p = gradeMany({}, 'card-1', [...phase1, ...phase2, ...phase3partial]);
  assert.equal(p['card-1'].level, 2);
  assert.equal(p['card-1'].levelCorrect, 0);
  assert.equal(p['card-1'].mastered, false);
});

test('applyGrade: mastered is sticky — wrong after mastery does not clear mastered', () => {
  const phase1: Array<'c'> = Array(PHASE_THRESHOLDS[0]).fill('c');
  const phase2: Array<'c'> = Array(PHASE_THRESHOLDS[1]).fill('c');
  const phase3: Array<'c'> = Array(PHASE_THRESHOLDS[2]).fill('c');
  let p = gradeMany({}, 'card-1', [...phase1, ...phase2, ...phase3]);
  assert.equal(p['card-1'].mastered, true);

  p = applyGrade(p, 'card-1', false);
  assert.equal(p['card-1'].mastered, true);
});

test('applyGrade: dayHistory grows only once per calendar day', () => {
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
  assert.equal(queue[0], 'card-2');
});

test('buildCycleQueue: anti-repeat — avoids same order as last cycle (3+ cards)', () => {
  const spaces = ['card-1', 'card-2', 'card-3'];
  const progress = defaultProgressFor(spaces);
  const first = buildCycleQueue(spaces, progress, [], 0, mulberry32(42));
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

  for (let i = 0; i < 2; i++) {
    session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(i));
  }
  assert.equal(session.cycleCount, 2);

  session = tickCycle({ ...session, currentCycleWrongs: 1 }, progress, path, mulberry32(99));
  assert.equal(session.cycleCount, 0, 'wrong in cycle resets cycleCount');
  assert.equal(session.spaces.length, SPACES_INIT, 'spaces should not grow');
});

test('tickCycle: card reaching SESSION_MASTERY_LEVEL moves to graduatedPool; next from waitingPool enters (Trigger B)', () => {
  const path = makePath(4);
  const progress = defaultProgressFor(path.map((c) => c.id));

  let session = initSessionState(path, progress, mulberry32(1));
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

  let session = initSessionState(path, progress, mulberry32(1));
  for (let i = 0; i < CYCLES_TO_GROW; i++) {
    session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(i));
  }
  assert.equal(session.spaces.length, SPACES_INIT + 1, 'spaces should be 3 before shrink test');

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
  for (let i = 0; i < 2; i++) {
    session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(i));
  }
  assert.equal(session.cycleCount, 2);

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
  assert.equal(session.waitingPool.length, 3);
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

test('computeGlobalProgress: 100% when all cards are mastered (level=SESSION_MASTERY_LEVEL)', () => {
  // A mastered card earns TOTAL_CORRECT_TO_MASTER (20) points
  const path = makePath(3);
  const progress: ProgressByCard = {};
  for (const card of path) {
    progress[card.id] = {
      ...getProgressForCard({}, card.id),
      level: SESSION_MASTERY_LEVEL,
      levelCorrect: 0,
      mastered: true,
    };
  }
  const result = computeGlobalProgress(progress, path);
  assert.equal(result.percent, 100);
  assert.equal(result.earned, path.length * TOTAL_CORRECT_TO_MASTER);
});

test('computeGlobalProgress: mid-session partial calculation using PHASE_CUMULATIVE', () => {
  // card-1 at level=1 (phase 1 done), levelCorrect=2 → earned = PHASE_CUMULATIVE[1] + 2 = 5 + 2 = 7
  // card-2 at level=0, levelCorrect=0 → earned = 0
  // max = 2 * 20 = 40
  // percent = round(7/40 * 100) = round(17.5) = 18
  const path = makePath(2);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 1, levelCorrect: 2 },
    'card-2': { ...getProgressForCard({}, 'card-2'), level: 0, levelCorrect: 0 },
  };
  const result = computeGlobalProgress(progress, path);
  assert.equal(result.earned, PHASE_CUMULATIVE[1] + 2); // 7
  assert.equal(result.max, 2 * TOTAL_CORRECT_TO_MASTER); // 40
  assert.equal(result.percent, Math.round((PHASE_CUMULATIVE[1] + 2) / (2 * TOTAL_CORRECT_TO_MASTER) * 100));
});

test('computeGlobalProgress: never exceeds 100%', () => {
  const path = makePath(2);
  const progress: ProgressByCard = {};
  for (const card of path) {
    progress[card.id] = { ...getProgressForCard({}, card.id), level: 99, levelCorrect: 99 };
  }
  const result = computeGlobalProgress(progress, path);
  assert.ok(result.percent <= 100);
});

// ---------------------------------------------------------------------------
// migrateProgress
// ---------------------------------------------------------------------------

test('migrateProgress: null → { schemaVersion: 5, byCard: {} }', () => {
  const out = migrateProgress(null);
  assert.equal(out.schemaVersion, 5);
  assert.deepEqual(out.byCard, {});
});

test('migrateProgress: undefined → { schemaVersion: 5, byCard: {} }', () => {
  const out = migrateProgress(undefined);
  assert.equal(out.schemaVersion, 5);
  assert.deepEqual(out.byCard, {});
});

test('migrateProgress: v5 input passes through with missing fields filled from defaults', () => {
  const v5 = {
    schemaVersion: 5 as const,
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
  const out = migrateProgress(v5);
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.byCard['card-x'].correctCount, 3);
  assert.equal(out.byCard['card-x'].level, 0);
  assert.equal(out.byCard['card-x'].levelCorrect, 3);
});

test('migrateProgress: v4 mastered card promoted to level=SESSION_MASTERY_LEVEL in v5', () => {
  const v4 = {
    schemaVersion: 4 as const,
    byCard: {
      'card-a': {
        correctCount: 10,
        wrongCount: 0,
        seenCount: 10,
        mastered: true,
        lastSeenAt: '2026-05-10T12:00:00.000Z',
        firstSeenAt: '2026-05-09T12:00:00.000Z',
        dayHistory: ['2026-05-09', '2026-05-10'],
        level: 2, // old mastery level
        levelCorrect: 0,
        wrongFlag: false,
        lastShownCycleIndex: 0,
      },
    },
  };
  const out = migrateProgress(v4);
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.byCard['card-a'].level, SESSION_MASTERY_LEVEL); // promoted to 3
  assert.equal(out.byCard['card-a'].mastered, true);
});

test('migrateProgress: v4 non-mastered card carries forward as-is', () => {
  const v4 = {
    schemaVersion: 4 as const,
    byCard: {
      'card-b': {
        correctCount: 3,
        wrongCount: 1,
        seenCount: 4,
        mastered: false,
        lastSeenAt: null,
        firstSeenAt: null,
        dayHistory: [],
        level: 0,
        levelCorrect: 3,
        wrongFlag: false,
        lastShownCycleIndex: 0,
      },
    },
  };
  const out = migrateProgress(v4);
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.byCard['card-b'].level, 0);
  assert.equal(out.byCard['card-b'].levelCorrect, 3);
  assert.equal(out.byCard['card-b'].mastered, false);
});

test('migrateProgress: v3 mastered card → level=SESSION_MASTERY_LEVEL, schemaVersion=5', () => {
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
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.byCard['card-a'].level, SESSION_MASTERY_LEVEL);
  assert.equal(out.byCard['card-a'].mastered, true);
  assert.equal(out.byCard['card-a'].wrongFlag, false);
});

test('migrateProgress: v3 non-mastered with correctCount >= PHASE_THRESHOLDS[0] → level 1', () => {
  const v3 = {
    schemaVersion: 3 as const,
    byCard: {
      'card-b': {
        correctCount: PHASE_THRESHOLDS[0] + 2,
        wrongCount: 1,
        seenCount: PHASE_THRESHOLDS[0] + 3,
        mastered: false,
        lastSeenAt: null,
        firstSeenAt: null,
        dayHistory: [],
        streak: 3,
      },
    },
  };
  const out = migrateProgress(v3);
  assert.equal(out.schemaVersion, 5);
  assert.equal(out.byCard['card-b'].level, 1);
  assert.equal(out.byCard['card-b'].mastered, false);
});

test('migrateProgress: v3 non-mastered with correctCount < PHASE_THRESHOLDS[0] → level 0', () => {
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
  assert.equal(out.schemaVersion, 5);
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
