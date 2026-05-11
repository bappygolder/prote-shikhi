# Weighted Queue, End-of-Stack Refresher & Practice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat one-slot-per-card cycle queue with a mastery-weighted queue, add graduated-card refreshers at end-of-stack, and enable a practice re-session when all cards are already mastered.

**Architecture:** All changes are confined to `lib/learning.ts` and `lib/learning.test.ts`. The core change is in `buildCycleQueue`, which gains a new `opts` parameter and uses two new internal helpers. `initSessionState` gains a practice-mode detection path. `tickCycle` gains a practice-mode bypass that skips graduate/grow/shrink logic. No UI changes.

**Tech Stack:** TypeScript, Node.js built-in test runner (`tsx --test`)

**Spec:** `docs/superpowers/specs/2026-05-11-weighted-queue-end-of-stack-practice-mode-design.md`

---

## File Map

| File | Change |
|---|---|
| `lib/learning.ts` | Add `BuildCycleQueueOpts` type; add `weightedNoConsecutiveShuffle` helper; add `cardSlotCount` helper; update `buildCycleQueue` signature + internals; add `practiceMode` to `SessionState`; update `initSessionState`; update `tickCycle` |
| `lib/learning.test.ts` | Update 2 broken tests; add ~15 new tests |

---

## Task 1: Helpers — `BuildCycleQueueOpts`, `cardSlotCount`, `weightedNoConsecutiveShuffle`

**Files:**
- Modify: `lib/learning.ts` (add type + 2 helpers near top)
- Modify: `lib/learning.test.ts` (add helper unit tests)

### Step 1.1 — Write failing tests for `weightedNoConsecutiveShuffle`

Add these tests to `lib/learning.test.ts` (after the existing imports, before other tests):

```ts
// ---------------------------------------------------------------------------
// weightedNoConsecutiveShuffle (internal helper — tested via exported wrapper)
// ---------------------------------------------------------------------------
// We test it indirectly through buildCycleQueue weighted-slot tests in Task 2.
// Direct tests below use a local re-implementation to confirm the contract.

test('weightedNoConsecutiveShuffle contract: total output length equals sum of weights', () => {
  // Import the helper indirectly by verifying buildCycleQueue output lengths.
  // A level-0 card has weight 3, a level-2 card has weight 1 → total 4.
  const spaces = ['card-1', 'card-2'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 0 },
    'card-2': { ...getProgressForCard({}, 'card-2'), level: 2 },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  // level-0 → 3 slots, level-2 → 1 slot = 4 total
  assert.equal(queue.length, 4);
});

test('weightedNoConsecutiveShuffle contract: no two consecutive identical entries when avoidable', () => {
  // level-0 card repeated 3 times + level-2 card once → [Z,A,Z,A,Z] not possible with 1 A.
  // But [Z,A,Z,Z] has ZZ — the algorithm must avoid this when possible.
  // With 1 A and 3 Zs: best possible is Z,A,Z,Z (forced Z at end) — still no leading pair.
  const spaces = ['card-1', 'card-2'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 0 }, // 3 slots
    'card-2': { ...getProgressForCard({}, 'card-2'), level: 2 }, // 1 slot
  };
  for (let seed = 0; seed < 20; seed++) {
    const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(seed));
    // card-2 must appear before the final card-1 repetition: [card-1, card-2, card-1, card-1] is invalid
    // Valid: [card-1, card-2, card-1, card-1] — only forced pair at very end is acceptable
    // The first occurrence of a consecutive pair must not be before the last slot
    let firstConsecutiveIdx = -1;
    for (let i = 0; i < queue.length - 1; i++) {
      if (queue[i] === queue[i + 1]) { firstConsecutiveIdx = i; break; }
    }
    if (firstConsecutiveIdx !== -1) {
      assert.equal(firstConsecutiveIdx, queue.length - 2,
        `consecutive pair should only appear at end (forced), got at index ${firstConsecutiveIdx}: ${queue.join(',')}`);
    }
  }
});
```

- [ ] **Step 1.1a: Run tests to confirm they fail**

```bash
cd "/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training" && npm test 2>&1 | tail -20
```

Expected: both new tests fail with assertion errors (queue.length is 2, not 4).

### Step 1.2 — Add `BuildCycleQueueOpts` type and helpers to `lib/learning.ts`

Insert after the existing constants block (after line 18, before the `Types` section comment):

```ts
// ---------------------------------------------------------------------------
// Types — extended
// ---------------------------------------------------------------------------

export type BuildCycleQueueOpts = {
  graduatedPool?: string[];
  waitingPool?: string[];
  practiceMode?: boolean;
  previousCardId?: string | null;
};
```

Add these two helpers after `fisherYates` and `arraysEqual` (before `getProgressForCard`):

> **Note:** `practiceMode: boolean` is added to `SessionState` in Task 4 (not here) to keep TypeScript happy through Tasks 1–3. The helpers below have no type dependency on it.

```ts
function cardSlotCount(
  id: string,
  progress: ProgressByCard,
  practiceMode: boolean,
  isRefresher: boolean,
): number {
  if (isRefresher) return 1;
  const p = getProgressForCard(progress, id);
  if (practiceMode) {
    const errorRate = p.wrongCount / (p.seenCount + 1);
    return 1 + Math.round(errorRate * 2);
  }
  return Math.max(1, SESSION_MASTERY_LEVEL - p.level);
}

function weightedNoConsecutiveShuffle(
  ids: string[],
  slotMap: Map<string, number>,
  rng: () => number,
): string[] {
  if (ids.length === 0) return [];
  const remaining = new Map(slotMap);
  const total = [...remaining.values()].reduce((a, b) => a + b, 0);
  const result: string[] = [];

  for (let i = 0; i < total; i++) {
    const last = result[result.length - 1] ?? null;
    const eligible = [...remaining.entries()].filter(([id, w]) => w > 0 && id !== last);
    const pool =
      eligible.length > 0
        ? eligible
        : [...remaining.entries()].filter(([, w]) => w > 0); // forced repeat fallback
    const maxW = Math.max(...pool.map(([, w]) => w));
    const top = pool.filter(([, w]) => w === maxW);
    const chosen = top[Math.floor(rng() * top.length)][0];
    result.push(chosen);
    remaining.set(chosen, remaining.get(chosen)! - 1);
  }

  return result;
}
```

- [ ] **Step 1.2a: Run tests** — the two new tests should now pass; all existing tests should still pass.

```bash
npm test 2>&1 | tail -20
```

Expected: `pass 58` (56 existing + 2 new).

- [ ] **Step 1.3: Commit**

```bash
cd "/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training" && git add lib/learning.ts lib/learning.test.ts && git commit -m "feat(algorithm): add BuildCycleQueueOpts type, cardSlotCount, weightedNoConsecutiveShuffle helpers"
```

---

## Task 2: Weighted Learning Slots + Anti-Consecutive Rule in `buildCycleQueue`

**Files:**
- Modify: `lib/learning.ts` — replace `buildCycleQueue` body; update `initSessionState` to pass opts; update `tickCycle` to pass opts
- Modify: `lib/learning.test.ts` — update 2 broken tests; add weight + anti-consecutive tests

### Step 2.1 — Update existing broken tests

The test `'buildCycleQueue: result length equals spaces.length'` and `'initSessionState: cycleQueue has exactly SPACES_INIT entries'` will break because weighted slots change cycle length. Update them now:

Find and replace in `lib/learning.test.ts`:

Old:
```ts
test('buildCycleQueue: result length equals spaces.length', () => {
  const path = makePath(3);
  const progress = defaultProgressFor(path.map((c) => c.id));
  const spaces = ['card-1', 'card-2', 'card-3'];
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  assert.equal(queue.length, spaces.length);
});
```

New:
```ts
test('buildCycleQueue: result length equals sum of slot counts for all spaces cards', () => {
  // All cards at level 0 → 3 slots each → 3 cards × 3 slots = 9
  const spaces = ['card-1', 'card-2', 'card-3'];
  const progress = defaultProgressFor(spaces);
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  assert.equal(queue.length, 9);
});
```

Find and replace:

Old:
```ts
test('initSessionState: cycleQueue has exactly SPACES_INIT entries', () => {
  const path = makePath(5);
  const session = initSessionState(path, {}, mulberry32(1));
  assert.equal(session.cycleQueue.length, SPACES_INIT);
});
```

New:
```ts
test('initSessionState: cycleQueue length equals sum of slot counts for initial spaces', () => {
  // SPACES_INIT=2 cards both at level 0 → 3 slots each → length = 6
  const path = makePath(5);
  const session = initSessionState(path, {}, mulberry32(1));
  // Each level-0 card has 3 slots: 2 × 3 = 6
  assert.equal(session.cycleQueue.length, SPACES_INIT * SESSION_MASTERY_LEVEL);
});
```

### Step 2.2 — Add new tests for weighted slots and anti-consecutive

Add after the existing `buildCycleQueue` tests:

```ts
test('buildCycleQueue: level-0 card appears 3 times in a cycle', () => {
  const spaces = ['card-1'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 0 },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  assert.equal(queue.length, 3);
  assert.ok(queue.every(id => id === 'card-1'));
});

test('buildCycleQueue: level-1 card appears 2 times in a cycle', () => {
  const spaces = ['card-1'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 1 },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  assert.equal(queue.length, 2);
});

test('buildCycleQueue: level-2 card appears 1 time in a cycle', () => {
  const spaces = ['card-1'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 2 },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1));
  assert.equal(queue.length, 1);
});

test('buildCycleQueue: anti-consecutive — first card rotated to back when it matches previousCardId', () => {
  const spaces = ['card-1', 'card-2'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 2 }, // 1 slot
    'card-2': { ...getProgressForCard({}, 'card-2'), level: 2 }, // 1 slot
  };
  // Run many seeds; whenever queue[0] would equal previousCardId, it should be rotated
  let foundRotation = false;
  for (let seed = 0; seed < 50; seed++) {
    const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(seed), {
      previousCardId: 'card-1',
    });
    assert.notEqual(queue[0], 'card-1',
      `queue[0] should not equal previousCardId='card-1', got: ${queue.join(',')}`);
    foundRotation = true;
  }
  assert.ok(foundRotation);
});

test('buildCycleQueue: no rotation when first card differs from previousCardId', () => {
  const spaces = ['card-1', 'card-2'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 2 },
    'card-2': { ...getProgressForCard({}, 'card-2'), level: 2 },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1), {
    previousCardId: 'card-99', // not in spaces — no rotation needed
  });
  // Queue should be valid and untouched by rotation
  assert.equal(queue.length, 2);
  assert.ok(queue.includes('card-1') && queue.includes('card-2'));
});
```

- [ ] **Step 2.2a: Run tests to confirm new tests fail**

```bash
npm test 2>&1 | tail -20
```

Expected: new tests fail (old `buildCycleQueue` doesn't use weighted slots yet).

### Step 2.3 — Replace `buildCycleQueue` body in `lib/learning.ts`

Replace the entire `buildCycleQueue` function with:

```ts
export function buildCycleQueue(
  spaces: string[],
  progress: ProgressByCard,
  cycleHistory: string[][],
  currentCycleIndex: number,
  rng: () => number = Math.random,
  opts: BuildCycleQueueOpts = {},
): string[] {
  const {
    graduatedPool = [],
    waitingPool = [],
    practiceMode = false,
    previousCardId = null,
  } = opts;

  const isEndOfStack = !practiceMode && waitingPool.length === 0 && graduatedPool.length > 0;

  // Priority / regular split
  const priority: string[] = [];
  const regular: string[] = [];
  const refresherSet = new Set<string>();

  for (const id of spaces) {
    const p = getProgressForCard(progress, id);
    const ageSinceShown = currentCycleIndex - p.lastShownCycleIndex;
    if (p.wrongFlag || ageSinceShown >= 3) {
      priority.push(id);
    } else {
      regular.push(id);
    }
  }

  // End-of-stack: pull graduated cards back as refreshers (sorted by error rate desc)
  if (isEndOfStack) {
    const shuffled = fisherYates([...graduatedPool], rng);
    shuffled.sort((a, b) => {
      const pa = getProgressForCard(progress, a);
      const pb = getProgressForCard(progress, b);
      return (pb.wrongCount / (pb.seenCount + 1)) - (pa.wrongCount / (pa.seenCount + 1));
    });
    for (const id of shuffled) {
      refresherSet.add(id);
      regular.push(id);
    }
  }

  // Build slot maps
  const prioritySlots = new Map<string, number>(
    priority.map((id) => [id, cardSlotCount(id, progress, practiceMode, false)]),
  );
  const regularSlots = new Map<string, number>(
    regular.map((id) => [id, cardSlotCount(id, progress, practiceMode, refresherSet.has(id))]),
  );

  // Weighted no-consecutive shuffle each group
  const priorityQueue = weightedNoConsecutiveShuffle(priority, prioritySlots, rng);
  const regularQueue = weightedNoConsecutiveShuffle(regular, regularSlots, rng);

  // Interleave: alternate priority then regular
  const result: string[] = [];
  let pi = 0;
  let ri = 0;
  while (pi < priorityQueue.length || ri < regularQueue.length) {
    if (pi < priorityQueue.length) result.push(priorityQueue[pi++]);
    if (ri < regularQueue.length) result.push(regularQueue[ri++]);
  }

  // Anti-consecutive at cycle boundary: rotate first card to back if it repeats last shown
  if (previousCardId !== null && result.length > 1 && result[0] === previousCardId) {
    result.push(result.shift()!);
  }

  // Anti-repeat: avoid identical sequence to last cycle
  const lastTwo = cycleHistory.slice(-2);
  let attempts = 1;
  while (attempts < 3) {
    if (lastTwo.length > 0 && arraysEqual(result, lastTwo[lastTwo.length - 1])) {
      const reRegular = weightedNoConsecutiveShuffle(regular, regularSlots, rng);
      result.length = 0;
      pi = 0;
      let rri = 0;
      while (pi < priorityQueue.length || rri < reRegular.length) {
        if (pi < priorityQueue.length) result.push(priorityQueue[pi++]);
        if (rri < reRegular.length) result.push(reRegular[rri++]);
      }
      if (previousCardId !== null && result.length > 1 && result[0] === previousCardId) {
        result.push(result.shift()!);
      }
      attempts++;
    } else {
      break;
    }
  }

  return result;
}
```

### Step 2.4 — Update `initSessionState` to pass opts

Replace the `buildCycleQueue` call inside `initSessionState`:

Old:
```ts
const cycleQueue = buildCycleQueue(spaces, progress, [], 0, rng);
```

New:
```ts
const cycleQueue = buildCycleQueue(spaces, progress, [], 0, rng, {
  graduatedPool,
  waitingPool,
  practiceMode: false,
});
```

Also add `practiceMode: false` to the returned object (it's now required on `SessionState`):

```ts
return {
  startedAt: new Date().toISOString(),
  cardsShown: 0,
  spaces,
  waitingPool,
  graduatedPool,
  cycleQueue,
  cycleIndex: 0,
  cycleCount: 0,
  cycleHistory: [],
  currentCycleIndex: 0,
  currentCycleWrongs: 0,
  previousCardId: null,
  practiceMode: false,
};
```

### Step 2.5 — Update `tickCycle` to pass opts to `buildCycleQueue`

Replace the `buildCycleQueue` call at the end of `tickCycle`:

Old:
```ts
const nextCycleQueue = buildCycleQueue(
  newSpaces,
  progress,
  newCycleHistory,
  newCurrentCycleIndex,
  rng,
);
```

New:
```ts
const nextCycleQueue = buildCycleQueue(
  newSpaces,
  progress,
  newCycleHistory,
  newCurrentCycleIndex,
  rng,
  {
    graduatedPool: newGraduatedPool,
    waitingPool: newWaitingPool,
    practiceMode: false,
    previousCardId: state.previousCardId,
  },
);
```

Also add `practiceMode: false` to `tickCycle`'s return object (spread from `state` already includes it, so no change needed — `...state` carries `practiceMode`).

- [ ] **Step 2.5a: Run all tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add lib/learning.ts lib/learning.test.ts && git commit -m "feat(algorithm): weighted learning slots and anti-consecutive rule in buildCycleQueue"
```

---

## Task 3: End-of-Stack Refresher Tests

The refresher logic is already implemented in `buildCycleQueue` (Task 2). This task adds the tests to verify the behavior.

**Files:**
- Modify: `lib/learning.test.ts` — add refresher tests

### Step 3.1 — Add failing tests for end-of-stack refresher

Add after the anti-consecutive tests:

```ts
// ---------------------------------------------------------------------------
// buildCycleQueue — end-of-stack refresher
// ---------------------------------------------------------------------------

test('buildCycleQueue: graduated cards appear as refreshers when waitingPool empty and graduatedPool non-empty', () => {
  const spaces = ['card-1']; // 1 unmastered card in spaces
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 0 },       // 3 slots
    'card-2': { ...getProgressForCard({}, 'card-2'), level: SESSION_MASTERY_LEVEL, mastered: true }, // refresher: 1 slot
    'card-3': { ...getProgressForCard({}, 'card-3'), level: SESSION_MASTERY_LEVEL, mastered: true }, // refresher: 1 slot
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1), {
    graduatedPool: ['card-2', 'card-3'],
    waitingPool: [],
  });
  // card-1: 3 slots, card-2: 1 slot, card-3: 1 slot → total 5
  assert.equal(queue.length, 5);
  assert.equal(queue.filter(id => id === 'card-1').length, 3);
  assert.equal(queue.filter(id => id === 'card-2').length, 1);
  assert.equal(queue.filter(id => id === 'card-3').length, 1);
});

test('buildCycleQueue: no refreshers when waitingPool is non-empty', () => {
  const spaces = ['card-1'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 0 },
    'card-2': { ...getProgressForCard({}, 'card-2'), level: SESSION_MASTERY_LEVEL, mastered: true },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1), {
    graduatedPool: ['card-2'],
    waitingPool: ['card-3'], // non-empty — no refresher mode
  });
  // card-1: 3 slots only — card-2 is NOT included
  assert.equal(queue.length, 3);
  assert.ok(!queue.includes('card-2'));
});

test('buildCycleQueue: graduated refreshers sorted by error rate desc (higher error rate first)', () => {
  const spaces = ['card-1'];
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), level: 2 }, // 1 slot
    // card-A: low error rate (10 seen, 9 correct, 1 wrong → 1/11 ≈ 0.09)
    'card-A': { ...getProgressForCard({}, 'card-A'), level: SESSION_MASTERY_LEVEL, mastered: true, seenCount: 10, wrongCount: 1 },
    // card-B: high error rate (10 seen, 5 correct, 5 wrong → 5/11 ≈ 0.45)
    'card-B': { ...getProgressForCard({}, 'card-B'), level: SESSION_MASTERY_LEVEL, mastered: true, seenCount: 10, wrongCount: 5 },
  };
  // Run many seeds to confirm card-B (higher error rate) consistently appears before card-A
  let bBeforeACount = 0;
  for (let seed = 0; seed < 20; seed++) {
    const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(seed), {
      graduatedPool: ['card-A', 'card-B'],
      waitingPool: [],
    });
    const idxA = queue.indexOf('card-A');
    const idxB = queue.indexOf('card-B');
    if (idxB < idxA) bBeforeACount++;
  }
  // card-B should appear before card-A in the majority of runs
  assert.ok(bBeforeACount >= 15, `card-B (higher error rate) should precede card-A in most runs, got ${bBeforeACount}/20`);
});
```

- [ ] **Step 3.1a: Run tests to confirm they pass**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass (refresher logic was already implemented in Task 2).

- [ ] **Step 3.2: Commit**

```bash
git add lib/learning.test.ts && git commit -m "test(algorithm): add end-of-stack refresher coverage for buildCycleQueue"
```

---

## Task 4: Practice Mode — `SessionState`, `initSessionState`, `tickCycle`, and `buildCycleQueue`

**Files:**
- Modify: `lib/learning.ts` — update `initSessionState` (practice path); update `tickCycle` (bypass)
- Modify: `lib/learning.test.ts` — add practice mode tests

### Step 4.1 — Write failing tests for practice mode

Add after the refresher tests:

```ts
// ---------------------------------------------------------------------------
// Practice mode
// ---------------------------------------------------------------------------

test('initSessionState: sets practiceMode=true when all cards are mastered', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-3': { ...getProgressForCard({}, 'card-3'), mastered: true, level: SESSION_MASTERY_LEVEL },
  };
  const session = initSessionState(path, progress, mulberry32(1));
  assert.equal(session.practiceMode, true);
});

test('initSessionState: all cards go into spaces when practiceMode (waitingPool and graduatedPool empty)', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-3': { ...getProgressForCard({}, 'card-3'), mastered: true, level: SESSION_MASTERY_LEVEL },
  };
  const session = initSessionState(path, progress, mulberry32(1));
  assert.equal(session.spaces.length, 3);
  assert.equal(session.waitingPool.length, 0);
  assert.equal(session.graduatedPool.length, 0);
});

test('initSessionState: practiceMode=false when any card is unmastered', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    // card-2 and card-3 not mastered
  };
  const session = initSessionState(path, progress, mulberry32(1));
  assert.equal(session.practiceMode, false);
});

test('buildCycleQueue: practice mode uses error-rate slots (higher wrongCount → more slots)', () => {
  const spaces = ['card-1', 'card-2'];
  const progress: ProgressByCard = {
    // card-1: no wrongs → slots = 1
    'card-1': { ...getProgressForCard({}, 'card-1'), seenCount: 10, wrongCount: 0 },
    // card-2: half wrong → slots = 1 + round(0.45*2) = 1 + 1 = 2
    'card-2': { ...getProgressForCard({}, 'card-2'), seenCount: 10, wrongCount: 5 },
  };
  const queue = buildCycleQueue(spaces, progress, [], 0, mulberry32(1), { practiceMode: true });
  // card-1: 1 slot, card-2: 2 slots → total 3
  assert.equal(queue.length, 3);
  assert.equal(queue.filter(id => id === 'card-2').length, 2);
  assert.equal(queue.filter(id => id === 'card-1').length, 1);
});

test('tickCycle: practice mode does not graduate cards out of spaces', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-3': { ...getProgressForCard({}, 'card-3'), mastered: true, level: SESSION_MASTERY_LEVEL },
  };
  let session = initSessionState(path, progress, mulberry32(1));
  assert.equal(session.practiceMode, true);
  assert.equal(session.spaces.length, 3);

  session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(1));

  // All 3 cards should still be in spaces after tick
  assert.equal(session.spaces.length, 3);
  assert.ok(session.spaces.includes('card-1'));
  assert.ok(session.spaces.includes('card-2'));
  assert.ok(session.spaces.includes('card-3'));
});

test('tickCycle: practice mode does not grow or shrink spaces', () => {
  const path = makePath(3);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-3': { ...getProgressForCard({}, 'card-3'), mastered: true, level: SESSION_MASTERY_LEVEL },
  };
  let session = initSessionState(path, progress, mulberry32(1));

  // Simulate many wrong answers — should NOT shrink in practice mode
  session = tickCycle(
    { ...session, currentCycleWrongs: CYCLE_WRONGS_TO_SHRINK + 5 },
    progress,
    path,
    mulberry32(1),
  );
  assert.equal(session.spaces.length, 3, 'practice mode should not shrink spaces');
});

test('tickCycle: practice mode preserves practiceMode=true across ticks', () => {
  const path = makePath(2);
  const progress: ProgressByCard = {
    'card-1': { ...getProgressForCard({}, 'card-1'), mastered: true, level: SESSION_MASTERY_LEVEL },
    'card-2': { ...getProgressForCard({}, 'card-2'), mastered: true, level: SESSION_MASTERY_LEVEL },
  };
  let session = initSessionState(path, progress, mulberry32(1));
  session = tickCycle({ ...session, currentCycleWrongs: 0 }, progress, path, mulberry32(1));
  assert.equal(session.practiceMode, true);
});
```

- [ ] **Step 4.1a: Run tests to confirm new tests fail**

```bash
npm test 2>&1 | tail -20
```

Expected: practice mode tests fail (logic not yet implemented).

### Step 4.2 — Add `practiceMode: boolean` to `SessionState` type, then update `initSessionState`

First, add the field to the `SessionState` type in `lib/learning.ts`:

```ts
export type SessionState = {
  startedAt: string;
  cardsShown: number;

  // Memory spaces
  spaces: string[];
  waitingPool: string[];
  graduatedPool: string[];

  // Cycle tracking
  cycleQueue: string[];
  cycleIndex: number;
  cycleCount: number;
  cycleHistory: string[][];
  currentCycleIndex: number;
  currentCycleWrongs: number;

  previousCardId: string | null;
  practiceMode: boolean;
};
```

Then replace the entire `initSessionState` function body in `lib/learning.ts`:

```ts
export function initSessionState(
  path: LetterCard[],
  progress: ProgressByCard,
  rng: () => number = Math.random,
): SessionState {
  const allMastered =
    path.length > 0 &&
    path.every((card) => getProgressForCard(progress, card.id).mastered);

  if (allMastered) {
    const spaces = path.map((c) => c.id);
    const cycleQueue = buildCycleQueue(spaces, progress, [], 0, rng, {
      graduatedPool: [],
      waitingPool: [],
      practiceMode: true,
    });
    return {
      startedAt: new Date().toISOString(),
      cardsShown: 0,
      spaces,
      waitingPool: [],
      graduatedPool: [],
      cycleQueue,
      cycleIndex: 0,
      cycleCount: 0,
      cycleHistory: [],
      currentCycleIndex: 0,
      currentCycleWrongs: 0,
      previousCardId: null,
      practiceMode: true,
    };
  }

  const unmastered = path.filter(
    (card) => !getProgressForCard(progress, card.id).mastered,
  );

  const initialSpaceCards = unmastered.slice(0, SPACES_INIT);
  const spaces = initialSpaceCards.map((c) => c.id);
  const waitingPool = unmastered.slice(SPACES_INIT).map((c) => c.id);
  const graduatedPool = path
    .filter((card) => getProgressForCard(progress, card.id).mastered)
    .map((c) => c.id);

  const cycleQueue = buildCycleQueue(spaces, progress, [], 0, rng, {
    graduatedPool,
    waitingPool,
    practiceMode: false,
  });

  return {
    startedAt: new Date().toISOString(),
    cardsShown: 0,
    spaces,
    waitingPool,
    graduatedPool,
    cycleQueue,
    cycleIndex: 0,
    cycleCount: 0,
    cycleHistory: [],
    currentCycleIndex: 0,
    currentCycleWrongs: 0,
    previousCardId: null,
    practiceMode: false,
  };
}
```

### Step 4.3 — Update `tickCycle` with practice mode bypass

Replace the entire `tickCycle` function in `lib/learning.ts`:

```ts
export function tickCycle(
  state: SessionState,
  progress: ProgressByCard,
  path: LetterCard[],
  rng: () => number = Math.random,
): SessionState {
  // Practice mode: skip all graduation/grow/shrink logic
  if (state.practiceMode) {
    const newCycleHistory = [...state.cycleHistory, state.cycleQueue].slice(-3);
    const newCurrentCycleIndex = state.currentCycleIndex + 1;
    const nextCycleQueue = buildCycleQueue(
      state.spaces,
      progress,
      newCycleHistory,
      newCurrentCycleIndex,
      rng,
      {
        graduatedPool: state.graduatedPool,
        waitingPool: state.waitingPool,
        practiceMode: true,
        previousCardId: state.previousCardId,
      },
    );
    return {
      ...state,
      cycleQueue: nextCycleQueue,
      cycleIndex: 0,
      cycleHistory: newCycleHistory,
      currentCycleIndex: newCurrentCycleIndex,
      currentCycleWrongs: 0,
    };
  }

  // Learning mode
  const allCorrect = state.currentCycleWrongs === 0;
  let newCycleCount = allCorrect ? state.cycleCount + 1 : 0;

  const newSpaces = [...state.spaces];
  const newWaitingPool = [...state.waitingPool];
  const newGraduatedPool = [...state.graduatedPool];

  const toGraduate = newSpaces.filter((id) => {
    const p = getProgressForCard(progress, id);
    return p.level >= SESSION_MASTERY_LEVEL;
  });

  for (const id of toGraduate) {
    const idx = newSpaces.indexOf(id);
    if (idx !== -1) newSpaces.splice(idx, 1);
    if (!newGraduatedPool.includes(id)) newGraduatedPool.push(id);
  }

  let backfilledCount = 0;
  for (let i = 0; i < toGraduate.length; i++) {
    if (newWaitingPool.length > 0 && newSpaces.length < SPACES_MAX) {
      const next = newWaitingPool.shift()!;
      newSpaces.push(next);
      backfilledCount++;
    }
  }
  if (toGraduate.length > 0 && backfilledCount > 0) {
    newCycleCount = 0;
  }

  if (
    newCycleCount >= CYCLES_TO_GROW &&
    newSpaces.length < SPACES_MAX &&
    newWaitingPool.length > 0
  ) {
    const next = newWaitingPool.shift()!;
    newSpaces.push(next);
    newCycleCount = 0;
  }

  if (
    state.currentCycleWrongs > CYCLE_WRONGS_TO_SHRINK &&
    newSpaces.length > SPACES_MIN
  ) {
    let weakestId = newSpaces[0];
    let weakestScore = Infinity;
    for (const id of newSpaces) {
      const p = getProgressForCard(progress, id);
      const score = (PHASE_CUMULATIVE[p.level] ?? TOTAL_CORRECT_TO_MASTER) + p.levelCorrect;
      if (score < weakestScore) {
        weakestScore = score;
        weakestId = id;
      }
    }
    const idx = newSpaces.indexOf(weakestId);
    if (idx !== -1) newSpaces.splice(idx, 1);
    newWaitingPool.unshift(weakestId);
    newCycleCount = 0;
  }

  const newCycleHistory = [...state.cycleHistory, state.cycleQueue].slice(-3);
  const newCurrentCycleIndex = state.currentCycleIndex + 1;

  const nextCycleQueue = buildCycleQueue(
    newSpaces,
    progress,
    newCycleHistory,
    newCurrentCycleIndex,
    rng,
    {
      graduatedPool: newGraduatedPool,
      waitingPool: newWaitingPool,
      practiceMode: false,
      previousCardId: state.previousCardId,
    },
  );

  return {
    ...state,
    spaces: newSpaces,
    waitingPool: newWaitingPool,
    graduatedPool: newGraduatedPool,
    cycleQueue: nextCycleQueue,
    cycleIndex: 0,
    cycleCount: newCycleCount,
    cycleHistory: newCycleHistory,
    currentCycleIndex: newCurrentCycleIndex,
    currentCycleWrongs: 0,
  };
}
```

- [ ] **Step 4.3a: Run all tests**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass (no failures).

- [ ] **Step 4.4: Run TypeScript type check**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4.5: Commit**

```bash
git add lib/learning.ts lib/learning.test.ts && git commit -m "feat(algorithm): practice re-session mode — all-mastered detection, error-rate weighting, tickCycle bypass"
```

---

## Self-Check Before Claiming Done

Run the full suite one final time and confirm the count:

```bash
npm test 2>&1
```

Expected: all tests pass with count ≥ 70 (56 original + ~15 new).

---

## Recommended Model

- Model: Sonnet 4.6 (`claude-sonnet-4-6`)
- Complexity: Medium
- Reason: All changes are in one well-understood file; the logic is non-trivial but self-contained.
