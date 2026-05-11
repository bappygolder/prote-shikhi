import { type LetterCard } from '../data/banglaLetters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LEVEL_COUNT = 4;
// Phase 1: 5 correct in any order (no streak penalty). Phase 2: 10 consecutive. Phase 3: 5 consecutive.
export const PHASE_THRESHOLDS = [5, 10, 5] as const;
export const PHASE_CUMULATIVE = [0, 5, 15] as const; // prefix sums of PHASE_THRESHOLDS
export const TOTAL_CORRECT_TO_MASTER = 20;
export const SESSION_MASTERY_LEVEL = 3;
export const SPACES_INIT = 2;
export const SPACES_MIN = 2;
export const SPACES_MAX = 4;
export const CYCLES_TO_GROW = 3;
export const NEW_CARD_PRIORITY_CYCLES = 3;
export const CYCLE_WRONGS_TO_SHRINK = 2;

// ---------------------------------------------------------------------------
// Build opts
// ---------------------------------------------------------------------------

export type BuildCycleQueueOpts = {
  graduatedPool?: string[];
  waitingPool?: string[];
  practiceMode?: boolean;
  previousCardId?: string | null;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LetterProgress = {
  // Core stats
  correctCount: number;
  wrongCount: number;
  seenCount: number;
  mastered: boolean;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  dayHistory: string[];

  // Level system
  level: number;
  levelCorrect: number;
  wrongFlag: boolean;
  lastShownCycleIndex: number;
};

export type ProgressByCard = Record<string, LetterProgress>;

export type ProgressState = {
  schemaVersion: 5;
  byCard: ProgressByCard;
};

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
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

function defaultLetterProgress(): LetterProgress {
  return {
    correctCount: 0,
    wrongCount: 0,
    seenCount: 0,
    mastered: false,
    lastSeenAt: null,
    firstSeenAt: null,
    dayHistory: [],
    level: 0,
    levelCorrect: 0,
    wrongFlag: false,
    lastShownCycleIndex: 0, // new cards default to 0; priority boost fires automatically when currentCycleIndex ≥ 3
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fisherYates<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

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

// ---------------------------------------------------------------------------
// Core progress accessors
// ---------------------------------------------------------------------------

export function getProgressForCard(
  progress: ProgressByCard,
  cardId: string,
): LetterProgress {
  return progress[cardId] ?? defaultLetterProgress();
}

export function isPresetComplete(
  cards: LetterCard[],
  progress: ProgressByCard,
): boolean {
  return cards.every((card) => getProgressForCard(progress, card.id).mastered);
}

export function resetCards(
  progress: ProgressByCard,
  cardIds: string[],
): ProgressByCard {
  if (cardIds.length === 0) return progress;
  const next = { ...progress };
  for (const id of cardIds) {
    delete next[id];
  }
  return next;
}

export function getUnlockedCards(
  cards: LetterCard[],
  progress: ProgressByCard,
): LetterCard[] {
  const unmastered = cards.filter(
    (c) => !getProgressForCard(progress, c.id).mastered,
  );
  return unmastered.length > 0 ? unmastered : cards;
}

// ---------------------------------------------------------------------------
// applyGrade
// ---------------------------------------------------------------------------

export function applyGrade(
  progress: ProgressByCard,
  cardId: string,
  wasCorrect: boolean,
  currentCycleIndex = 0,
): ProgressByCard {
  const current = getProgressForCard(progress, cardId);
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const seenCount = current.seenCount + 1;
  const firstSeenAt = current.firstSeenAt ?? now;
  const lastSeenAt = now;
  const dayHistory =
    current.dayHistory[current.dayHistory.length - 1] === today
      ? current.dayHistory
      : [...current.dayHistory, today];

  const lastShownCycleIndex = currentCycleIndex;

  if (wasCorrect) {
    const correctCount = current.correctCount + 1;
    const newLevelCorrect = current.levelCorrect + 1;
    let level = current.level;
    let levelCorrect = newLevelCorrect;
    const threshold = PHASE_THRESHOLDS[current.level] ?? PHASE_THRESHOLDS[PHASE_THRESHOLDS.length - 1];

    if (newLevelCorrect >= threshold) {
      level = current.level + 1;
      levelCorrect = 0;
    }

    const mastered = current.mastered || level >= SESSION_MASTERY_LEVEL;

    return {
      ...progress,
      [cardId]: {
        ...current,
        correctCount,
        seenCount,
        mastered,
        lastSeenAt,
        firstSeenAt,
        dayHistory,
        level,
        levelCorrect,
        wrongFlag: false,
        lastShownCycleIndex,
      },
    };
  }

  // Wrong answer — Phase 1 (level 0) is free: wrongs don't reset the counter.
  // Phases 2 & 3 require streaks, so wrongs reset levelCorrect.
  return {
    ...progress,
    [cardId]: {
      ...current,
      wrongCount: current.wrongCount + 1,
      seenCount,
      lastSeenAt,
      firstSeenAt,
      dayHistory,
      levelCorrect: current.level === 0 ? current.levelCorrect : 0,
      wrongFlag: true,
      lastShownCycleIndex,
    },
  };
}

// ---------------------------------------------------------------------------
// buildCycleQueue
// ---------------------------------------------------------------------------

export function buildCycleQueue(
  spaces: string[],
  progress: ProgressByCard,
  cycleHistory: string[][],
  currentCycleIndex: number,
  rng: () => number = Math.random,
): string[] {
  const priority: string[] = [];
  const other: string[] = [];

  for (const id of spaces) {
    const p = getProgressForCard(progress, id);
    const ageSinceShown = currentCycleIndex - p.lastShownCycleIndex;
    if (p.wrongFlag || ageSinceShown >= 3) {
      priority.push(id);
    } else {
      other.push(id);
    }
  }

  const lastTwo = cycleHistory.slice(-2);

  let shuffledOther = fisherYates(other, rng);
  let result = [...priority, ...shuffledOther];

  // Anti-repeat: avoid any two consecutive identical orders
  let attempts = 1;
  while (attempts < 3) {
    const matchesLast = lastTwo.length > 0 && arraysEqual(result, lastTwo[lastTwo.length - 1]);
    if (matchesLast) {
      shuffledOther = fisherYates(other, rng);
      result = [...priority, ...shuffledOther];
      attempts++;
    } else {
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// tickCycle
// ---------------------------------------------------------------------------

export function tickCycle(
  state: SessionState,
  progress: ProgressByCard,
  path: LetterCard[],
  rng: () => number = Math.random,
): SessionState {
  // 1. Check all-correct
  const allCorrect = state.currentCycleWrongs === 0;

  // 2. Update cycleCount
  let newCycleCount = allCorrect ? state.cycleCount + 1 : 0;

  // 3. Graduate cards that reached session mastery
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

  // 4. Add new cards from waitingPool for each graduated slot (Trigger B)
  let backfilledCount = 0;
  for (let i = 0; i < toGraduate.length; i++) {
    if (newWaitingPool.length > 0 && newSpaces.length < SPACES_MAX) {
      const next = newWaitingPool.shift()!;
      newSpaces.push(next);
      backfilledCount++;
    }
  }
  // Reset cycle counter after backfill to avoid unearned Trigger A growth
  if (toGraduate.length > 0 && backfilledCount > 0) {
    newCycleCount = 0;
  }

  // 5. Trigger A: consecutive all-correct cycles → grow by 1
  if (
    newCycleCount >= CYCLES_TO_GROW &&
    newSpaces.length < SPACES_MAX &&
    newWaitingPool.length > 0
  ) {
    const next = newWaitingPool.shift()!;
    newSpaces.push(next);
    newCycleCount = 0;
  }

  // 6. Shrink: too many wrongs this cycle
  if (
    state.currentCycleWrongs > CYCLE_WRONGS_TO_SHRINK &&
    newSpaces.length > SPACES_MIN
  ) {
    // Find weakest card: lowest cumulative score
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
    // Put back at front of waitingPool so it re-enters soon
    newWaitingPool.unshift(weakestId);
    newCycleCount = 0;
  }

  // 7. Update cycleHistory: keep last 3
  const newCycleHistory = [...state.cycleHistory, state.cycleQueue].slice(-3);

  // 8. Increment currentCycleIndex
  const newCurrentCycleIndex = state.currentCycleIndex + 1;

  // 9. Build next cycleQueue
  const nextCycleQueue = buildCycleQueue(
    newSpaces,
    progress,
    newCycleHistory,
    newCurrentCycleIndex,
    rng,
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

// ---------------------------------------------------------------------------
// initSessionState
// ---------------------------------------------------------------------------

export function initSessionState(
  path: LetterCard[],
  progress: ProgressByCard,
  rng: () => number = Math.random,
): SessionState {
  const unmastered = path.filter(
    (card) => !getProgressForCard(progress, card.id).mastered,
  );

  const initialSpaceCards = unmastered.slice(0, SPACES_INIT);
  const spaces = initialSpaceCards.map((c) => c.id);
  const waitingPool = unmastered.slice(SPACES_INIT).map((c) => c.id);
  const graduatedPool = path
    .filter((card) => getProgressForCard(progress, card.id).mastered)
    .map((c) => c.id);

  const cycleQueue = buildCycleQueue(spaces, progress, [], 0, rng);

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
  };
}

// ---------------------------------------------------------------------------
// chooseNextCard
// ---------------------------------------------------------------------------

export function chooseNextCard(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
  session?: SessionState,
  rng: () => number = Math.random,
): LetterCard {
  const cardById = new Map<string, LetterCard>(cards.map((c) => [c.id, c]));

  if (session) {
    const id = session.cycleQueue[session.cycleIndex];
    if (id !== undefined) {
      const card = cardById.get(id);
      if (card) return card;
    }
    // Fallback if cycleQueue is empty or id not found
    const fallback = cards.find(
      (c) => !getProgressForCard(progress, c.id).mastered,
    );
    return fallback ?? cards[0];
  }

  // No session — build a transient one
  const unmastered = cards.filter(
    (c) => !getProgressForCard(progress, c.id).mastered,
  );
  const seed = unmastered.length > 0 ? unmastered : cards;
  const spaces = seed.slice(0, SPACES_INIT).map((c) => c.id);
  const cycleQueue = buildCycleQueue(spaces, progress, [], 0, rng);

  const firstId = cycleQueue[0];
  if (firstId !== undefined) {
    const card = cardById.get(firstId);
    if (card) return card;
  }

  return seed[0] ?? cards[0];
}

// ---------------------------------------------------------------------------
// computeGlobalProgress
// ---------------------------------------------------------------------------

export function computeGlobalProgress(
  progress: ProgressByCard,
  cards: LetterCard[],
): { earned: number; max: number; percent: number } {
  let earned = 0;
  for (const card of cards) {
    const p = getProgressForCard(progress, card.id);
    const cardEarned = Math.min(
      (PHASE_CUMULATIVE[p.level] ?? TOTAL_CORRECT_TO_MASTER) + p.levelCorrect,
      TOTAL_CORRECT_TO_MASTER,
    );
    earned += cardEarned;
  }

  const max = cards.length * TOTAL_CORRECT_TO_MASTER;
  const percent = max === 0 ? 0 : Math.min(100, Math.round((earned / max) * 100));
  return { earned, max, percent };
}

// ---------------------------------------------------------------------------
// migrateProgress
// ---------------------------------------------------------------------------

export function migrateProgress(raw: unknown): ProgressState {
  // Already v5 — fill in any missing fields defensively
  if (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: unknown }).schemaVersion === 5
  ) {
    const v5 = raw as { schemaVersion: 5; byCard: Record<string, unknown> };
    const byCard: ProgressByCard = {};
    for (const [id, entry] of Object.entries(v5.byCard ?? {})) {
      if (entry !== null && typeof entry === 'object') {
        byCard[id] = { ...defaultLetterProgress(), ...(entry as Partial<LetterProgress>) };
      } else {
        byCard[id] = defaultLetterProgress();
      }
    }
    return { schemaVersion: 5, byCard };
  }

  // v4 → v5: mastered cards promoted to level 3; others carry forward
  if (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: unknown }).schemaVersion === 4
  ) {
    const v4 = raw as { schemaVersion: 4; byCard: Record<string, unknown> };
    const byCard: ProgressByCard = {};
    for (const [id, entry] of Object.entries(v4.byCard ?? {})) {
      const base: LetterProgress =
        entry !== null && typeof entry === 'object'
          ? { ...defaultLetterProgress(), ...(entry as Partial<LetterProgress>) }
          : defaultLetterProgress();
      if (base.mastered) {
        base.level = SESSION_MASTERY_LEVEL;
        base.levelCorrect = 0;
      }
      byCard[id] = base;
    }
    return { schemaVersion: 5, byCard };
  }

  // v3 → v4
  if (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: unknown }).schemaVersion === 3
  ) {
    const v3 = raw as {
      schemaVersion: 3;
      byCard: Record<string, {
        correctCount?: number;
        wrongCount?: number;
        seenCount?: number;
        mastered?: boolean;
        lastSeenAt?: string | null;
        firstSeenAt?: string | null;
        dayHistory?: string[];
        streak?: number;
      }>;
    };
    const byCard: ProgressByCard = {};
    for (const [id, old] of Object.entries(v3.byCard)) {
      byCard[id] = migrateOldCard(old);
    }
    return { schemaVersion: 5, byCard };
  }

  // v2 → v5
  if (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: unknown }).schemaVersion === 2
  ) {
    const v2 = raw as {
      schemaVersion: 2;
      byCard: Record<string, {
        correctCount?: number;
        wrongCount?: number;
        seenCount?: number;
        mastered?: boolean;
        lastSeenAt?: string | null;
        firstSeenAt?: string | null;
        dayHistory?: string[];
      }>;
    };
    const byCard: ProgressByCard = {};
    for (const [id, old] of Object.entries(v2.byCard)) {
      byCard[id] = migrateOldCard(old);
    }
    return { schemaVersion: 5, byCard };
  }

  // null / undefined / empty
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return { schemaVersion: 5, byCard: {} };
  }

  // v1 (legacy flat object — no schemaVersion)
  const legacy = raw as Record<string, unknown>;
  // If the only keys look like card IDs and values are objects, treat as v1
  const byCard: ProgressByCard = {};
  for (const [id, value] of Object.entries(legacy)) {
    if (value === null || typeof value !== 'object') continue;
    const old = value as {
      correctCount?: number;
      wrongCount?: number;
      seenCount?: number;
      mastered?: boolean;
      lastSeenAt?: string | null;
      firstSeenAt?: string | null;
      dayHistory?: string[];
    };
    byCard[id] = migrateOldCard(old);
  }
  return { schemaVersion: 5, byCard };
}

type OldCardShape = {
  correctCount?: number;
  wrongCount?: number;
  seenCount?: number;
  mastered?: boolean;
  lastSeenAt?: string | null;
  firstSeenAt?: string | null;
  dayHistory?: string[];
  streak?: number;
};

function migrateOldCard(old: OldCardShape): LetterProgress {
  const correctCount = old.correctCount ?? 0;
  const streak = old.streak ?? 0;

  let level: number;
  let levelCorrect: number;

  if (old.mastered === true) {
    level = SESSION_MASTERY_LEVEL;
    levelCorrect = 0;
  } else if (correctCount >= PHASE_THRESHOLDS[0]) {
    // Old warmup done, was in streak phase
    level = 1;
    levelCorrect = Math.min(streak, PHASE_THRESHOLDS[1] - 1);
  } else {
    level = 0;
    levelCorrect = Math.min(correctCount, PHASE_THRESHOLDS[0] - 1);
  }

  return {
    correctCount,
    wrongCount: old.wrongCount ?? 0,
    seenCount: old.seenCount ?? 0,
    mastered: old.mastered ?? false,
    lastSeenAt: old.lastSeenAt ?? null,
    firstSeenAt: old.firstSeenAt ?? null,
    dayHistory: old.dayHistory ?? [],
    level,
    levelCorrect,
    wrongFlag: false,
    lastShownCycleIndex: 0,
  };
}
