import { MASTERY_TARGET, type LetterCard } from '../data/banglaLetters';

export type LetterProgress = {
  correctCount: number;
  wrongCount: number;
  seenCount: number;
  mastered: boolean;
  lastSeenAt: string | null;
};

export type ProgressByCard = Record<string, LetterProgress>;

const INITIAL_UNLOCK_COUNT = 5;
const UNLOCK_STEP = 2;

export function getProgressForCard(
  progress: ProgressByCard,
  cardId: string,
): LetterProgress {
  return (
    progress[cardId] ?? {
      correctCount: 0,
      wrongCount: 0,
      seenCount: 0,
      mastered: false,
      lastSeenAt: null,
    }
  );
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

export function applyGrade(
  progress: ProgressByCard,
  cardId: string,
  wasCorrect: boolean,
): ProgressByCard {
  const current = getProgressForCard(progress, cardId);
  const correctCount = current.correctCount + (wasCorrect ? 1 : 0);
  const wrongCount = current.wrongCount + (wasCorrect ? 0 : 1);

  return {
    ...progress,
    [cardId]: {
      correctCount,
      wrongCount,
      seenCount: current.seenCount + 1,
      mastered: correctCount >= MASTERY_TARGET,
      lastSeenAt: new Date().toISOString(),
    },
  };
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
