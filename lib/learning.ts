import { MASTERY_TARGET, type LetterCard } from '../data/banglaLetters';

export { MASTERY_TARGET } from '../data/banglaLetters';

export const RECENT_WINDOW = 6;
export const WARMUP_PER_CARD = 5;
export const PENALTY_MAX = 16;
export const PENALTY_HALVE_ON_CORRECT = true;

export type LetterProgress = {
  // existing — preserved
  correctCount: number;
  wrongCount: number;
  seenCount: number;
  mastered: boolean;
  lastSeenAt: string | null;

  // streak (mastery signal)
  streak: number;
  bestStreak: number;

  // penalty / mistake dynamics
  penalty: number;
  consecutiveMistakes: number;

  // recency / selection signal
  recentResults: Array<'c' | 'w'>;

  // active-set lifecycle
  attemptsSinceEnteringActive: number;
  enteredActiveAt: string | null;
  cardsShownSinceMastered: number;

  // interleaving
  sprinkleCooldown: number;

  // reserved (defer; not populated yet)
  timeSpentMs: number;

  // timestamp
  firstSeenAt: string | null;
};

export type ProgressByCard = Record<string, LetterProgress>;

export type ProgressState = {
  schemaVersion: 2;
  byCard: ProgressByCard;
};

const INITIAL_UNLOCK_COUNT = 5;
const UNLOCK_STEP = 2;

function defaultLetterProgress(): LetterProgress {
  return {
    correctCount: 0,
    wrongCount: 0,
    seenCount: 0,
    mastered: false,
    lastSeenAt: null,
    streak: 0,
    bestStreak: 0,
    penalty: 0,
    consecutiveMistakes: 0,
    recentResults: [],
    attemptsSinceEnteringActive: 0,
    enteredActiveAt: null,
    cardsShownSinceMastered: 0,
    sprinkleCooldown: 0,
    timeSpentMs: 0,
    firstSeenAt: null,
  };
}

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
  if (cardIds.length === 0) {
    return progress;
  }
  const next = { ...progress };
  for (const id of cardIds) {
    delete next[id];
  }
  return next;
}

function pushBounded<T>(arr: T[], item: T, max: number): T[] {
  const next = arr.length >= max ? arr.slice(arr.length - max + 1) : arr.slice();
  next.push(item);
  return next;
}

export function applyGrade(
  progress: ProgressByCard,
  cardId: string,
  wasCorrect: boolean,
): ProgressByCard {
  const current = getProgressForCard(progress, cardId);
  const now = new Date().toISOString();

  const seenCount = current.seenCount + 1;
  const firstSeenAt = current.firstSeenAt ?? now;
  const lastSeenAt = now;

  if (wasCorrect) {
    const correctCount = current.correctCount + 1;
    const isWarmupActive = correctCount <= WARMUP_PER_CARD;
    const streak = isWarmupActive ? current.streak : current.streak + 1;
    const bestStreak = streak > current.bestStreak ? streak : current.bestStreak;
    const mastered = current.mastered || streak >= MASTERY_TARGET;
    const penalty = PENALTY_HALVE_ON_CORRECT
      ? Math.floor(current.penalty / 2)
      : Math.max(0, current.penalty - 1);
    const recentResults = pushBounded(current.recentResults, 'c', RECENT_WINDOW);

    return {
      ...progress,
      [cardId]: {
        ...current,
        correctCount,
        wrongCount: current.wrongCount,
        seenCount,
        mastered,
        lastSeenAt,
        firstSeenAt,
        streak,
        bestStreak,
        penalty,
        consecutiveMistakes: 0,
        recentResults,
      },
    };
  }

  const wrongCount = current.wrongCount + 1;
  const consecutiveMistakes = current.consecutiveMistakes + 1;
  const penalty =
    consecutiveMistakes === 1
      ? 1
      : Math.min(current.penalty * 2, PENALTY_MAX);
  const recentResults = pushBounded(current.recentResults, 'w', RECENT_WINDOW);

  return {
    ...progress,
    [cardId]: {
      ...current,
      correctCount: current.correctCount,
      wrongCount,
      seenCount,
      mastered: current.mastered,
      lastSeenAt,
      firstSeenAt,
      streak: 0,
      penalty,
      consecutiveMistakes,
      recentResults,
    },
  };
}

export function migrateProgress(raw: unknown): ProgressState {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    (raw as { schemaVersion?: unknown }).schemaVersion === 2
  ) {
    return raw as ProgressState;
  }

  const byCard: ProgressByCard = {};
  if (raw === null || raw === undefined || typeof raw !== 'object') {
    return { schemaVersion: 2, byCard };
  }

  const legacy = raw as Record<string, Partial<LetterProgress> | unknown>;
  for (const [id, value] of Object.entries(legacy)) {
    if (value === null || typeof value !== 'object') {
      continue;
    }
    const old = value as Partial<LetterProgress>;
    byCard[id] = {
      correctCount: old.correctCount ?? 0,
      wrongCount: old.wrongCount ?? 0,
      seenCount: old.seenCount ?? 0,
      mastered: old.mastered ?? false,
      lastSeenAt: old.lastSeenAt ?? null,
      streak: 0,
      bestStreak: 0,
      penalty: 0,
      consecutiveMistakes: 0,
      recentResults: [],
      attemptsSinceEnteringActive: 0,
      enteredActiveAt: null,
      cardsShownSinceMastered: old.mastered ? 999 : 0,
      sprinkleCooldown: 0,
      timeSpentMs: 0,
      firstSeenAt: old.lastSeenAt ?? null,
    };
  }
  return { schemaVersion: 2, byCard };
}

export function getUnlockedCards(
  cards: LetterCard[],
  progress: ProgressByCard,
): LetterCard[] {
  let unlockedCount = Math.min(INITIAL_UNLOCK_COUNT, cards.length);

  while (unlockedCount < cards.length) {
    const unlockedCards = cards.slice(0, unlockedCount);
    const allUnlockedMastered = unlockedCards.every(
      (card) => getProgressForCard(progress, card.id).mastered,
    );

    if (!allUnlockedMastered) {
      break;
    }

    unlockedCount = Math.min(cards.length, unlockedCount + UNLOCK_STEP);
  }

  return cards.slice(0, unlockedCount);
}

const NEWCOMER_BOOST_MAX = 6;
const NEWCOMER_DECAY_REPS = 8;
const W_WRONG = 2;
const POOL_SIZE = 5;

function visibilityScore(progress: LetterProgress): number {
  const remainingTerm = Math.max(0, MASTERY_TARGET - progress.correctCount);
  const wrongTerm = progress.wrongCount * W_WRONG;
  const newcomerTerm = Math.max(
    0,
    NEWCOMER_BOOST_MAX * (1 - progress.seenCount / NEWCOMER_DECAY_REPS),
  );
  return remainingTerm + wrongTerm + newcomerTerm;
}

function weightedRandomPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function chooseNextCard(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
): LetterCard {
  const unmasteredCards = cards.filter(
    (card) => !getProgressForCard(progress, card.id).mastered,
  );
  const candidateCards = unmasteredCards.length > 0 ? unmasteredCards : cards;

  const ranked = [...candidateCards].sort((a, b) => {
    const sa = visibilityScore(getProgressForCard(progress, a.id));
    const sb = visibilityScore(getProgressForCard(progress, b.id));
    if (sa !== sb) return sb - sa;
    return a.order - b.order;
  });

  const pool = ranked.slice(0, Math.min(POOL_SIZE, ranked.length));

  const eligible =
    pool.length > 1
      ? pool.filter((card) => card.id !== previousCardId)
      : pool;

  const weights = eligible.map((card) =>
    visibilityScore(getProgressForCard(progress, card.id)),
  );

  return weightedRandomPick(eligible, weights);
}
