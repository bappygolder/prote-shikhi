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

export function chooseNextCard(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
): LetterCard {
  const unmasteredCards = cards.filter(
    (card) => !getProgressForCard(progress, card.id).mastered,
  );
  const candidateCards = unmasteredCards.length > 0 ? unmasteredCards : cards;

  const orderedCards = [...candidateCards].sort((first, second) => {
    const firstProgress = getProgressForCard(progress, first.id);
    const secondProgress = getProgressForCard(progress, second.id);
    const firstRemaining = MASTERY_TARGET - firstProgress.correctCount;
    const secondRemaining = MASTERY_TARGET - secondProgress.correctCount;

    if (firstRemaining !== secondRemaining) {
      return secondRemaining - firstRemaining;
    }

    if (firstProgress.wrongCount !== secondProgress.wrongCount) {
      return secondProgress.wrongCount - firstProgress.wrongCount;
    }

    if (firstProgress.seenCount !== secondProgress.seenCount) {
      return firstProgress.seenCount - secondProgress.seenCount;
    }

    return first.order - second.order;
  });

  const practicePool = orderedCards.slice(0, Math.min(3, orderedCards.length));
  const nextOptions =
    practicePool.length > 1
      ? practicePool.filter((card) => card.id !== previousCardId)
      : practicePool;

  return nextOptions[Math.floor(Math.random() * nextOptions.length)];
}
