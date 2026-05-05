import { MASTERY_TARGET, type LetterCard } from '../data/banglaLetters';

export { MASTERY_TARGET } from '../data/banglaLetters';

export const RECENT_WINDOW = 6;
export const WARMUP_PER_CARD = 5;
export const PENALTY_MAX = 16;
export const PENALTY_HALVE_ON_CORRECT = true;

// Active-set sizing (spec §6).
export const ACTIVE_SET_START = 2;
export const ACTIVE_SET_STEADY = 3;
export const ACTIVE_SET_STRUGGLE = 2;

// Struggle-mode transitions.
export const STRUGGLE_WRONG_THRESHOLD = 2;
export const STRUGGLE_RECOVERY_STREAK = 6;

// Newcomer boost — visibility score additive term that decays linearly.
export const NEW_CARD_BOOST_DURATION = 8;
export const NEW_CARD_BOOST_WEIGHT = 8;

// Visibility-score weights (spec §8).
export const W_BASE = 1;
export const W_RECENT_MISS = 4;
export const W_PENALTY = 1.5;
export const W_STREAK_GAP = 0.3;
export const W_FRESHNESS = 0.5;
// W_SPRINKLE is referenced by CTX-07's sprinkle eligibility; declared here so the
// tunables live in one place even though CTX-06 doesn't read it.
export const W_SPRINKLE = 2.5;

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

export type SessionState = {
  startedAt: string;
  cardsShown: number;
  recentGrades: Array<'c' | 'w'>;
  inStruggleMode: boolean;
  consecutiveCorrectInSession: number;
  previousCardId: string | null;
  twoBackCardId: string | null;
  activeSet: string[];
  prePushedActiveSet: string[] | null;
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

export function pushBounded<T>(arr: T[], item: T, max: number): T[] {
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

// ---------------------------------------------------------------------------
// Session state — spec §5
// ---------------------------------------------------------------------------

export function initSessionState(
  path: LetterCard[],
  progress: ProgressByCard,
): SessionState {
  const unmastered = path.filter(
    (card) => !getProgressForCard(progress, card.id).mastered,
  );
  const activeSet = unmastered.slice(0, ACTIVE_SET_START).map((c) => c.id);

  return {
    startedAt: new Date().toISOString(),
    cardsShown: 0,
    recentGrades: [],
    inStruggleMode: false,
    consecutiveCorrectInSession: 0,
    previousCardId: null,
    twoBackCardId: null,
    activeSet,
    prePushedActiveSet: null,
  };
}

function nextUnenteredFromPath(
  path: LetterCard[],
  state: SessionState,
): LetterCard | null {
  const used = new Set<string>(state.activeSet);
  if (state.prePushedActiveSet) {
    for (const id of state.prePushedActiveSet) used.add(id);
  }
  for (const card of path) {
    if (!used.has(card.id)) return card;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Active-set lifecycle — spec §9
// ---------------------------------------------------------------------------

export function applyActiveSetOnCorrect(
  state: SessionState,
  _cardId: string,
  _cardProgress: LetterProgress,
  path: LetterCard[],
): SessionState {
  if (state.inStruggleMode) return state;
  if (state.activeSet.length >= ACTIVE_SET_STEADY) return state;

  const next = nextUnenteredFromPath(path, state);
  if (!next) return state;

  return {
    ...state,
    activeSet: [...state.activeSet, next.id],
  };
}

export function applyActiveSetOnMastery(
  state: SessionState,
  masteredCardId: string,
  path: LetterCard[],
): SessionState {
  const remaining = state.activeSet.filter((id) => id !== masteredCardId);
  // The just-mastered card has left the active set but must NOT be re-picked
  // here as the "next un-entered" card. Inject it into the search state's
  // activeSet so nextUnenteredFromPath skips it.
  let nextActive = remaining;
  const next = nextUnenteredFromPath(path, {
    ...state,
    activeSet: [...remaining, masteredCardId],
  });
  if (next) nextActive = [...remaining, next.id];

  return {
    ...state,
    activeSet: nextActive,
  };
}

// ---------------------------------------------------------------------------
// Struggle mode — spec §9
// ---------------------------------------------------------------------------

export function struggleScore(
  card: LetterCard,
  cardProgress: LetterProgress,
): number {
  void card;
  const wrongs = cardProgress.recentResults.filter((r) => r === 'w').length;
  return cardProgress.consecutiveMistakes * 3 + cardProgress.penalty + wrongs;
}

function countWrongs(grades: Array<'c' | 'w'>): number {
  let n = 0;
  for (const g of grades) if (g === 'w') n += 1;
  return n;
}

export function maybeEnterStruggleMode(
  state: SessionState,
  progress: ProgressByCard,
  path: LetterCard[],
): SessionState {
  if (state.inStruggleMode) return state;
  if (countWrongs(state.recentGrades) < STRUGGLE_WRONG_THRESHOLD) return state;

  const cardById = new Map<string, LetterCard>(path.map((c) => [c.id, c]));
  const ranked = [...state.activeSet]
    .map((id) => {
      const card = cardById.get(id);
      const cardProgress = getProgressForCard(progress, id);
      return {
        id,
        score: card ? struggleScore(card, cardProgress) : 0,
        order: card?.order ?? Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    });

  const shrunk = ranked
    .slice(0, Math.min(ACTIVE_SET_STRUGGLE, ranked.length))
    .map((entry) => entry.id);

  return {
    ...state,
    inStruggleMode: true,
    prePushedActiveSet: state.activeSet,
    activeSet: shrunk,
  };
}

export function maybeExitStruggleMode(
  state: SessionState,
  _path: LetterCard[],
): SessionState {
  if (!state.inStruggleMode) return state;
  if (state.consecutiveCorrectInSession < STRUGGLE_RECOVERY_STREAK) return state;

  return {
    ...state,
    inStruggleMode: false,
    activeSet: state.prePushedActiveSet ?? state.activeSet,
    prePushedActiveSet: null,
  };
}

// ---------------------------------------------------------------------------
// Visibility score — spec §8
// ---------------------------------------------------------------------------

export function visibilityScore(
  card: LetterCard,
  cardProgress: LetterProgress,
  state: SessionState,
): number {
  // Hard rules.
  if (card.id === state.previousCardId && state.activeSet.length > 1) return 0;
  if (cardProgress.mastered) return 0;

  let score = W_BASE;

  if (cardProgress.attemptsSinceEnteringActive < NEW_CARD_BOOST_DURATION) {
    const decay =
      1 - cardProgress.attemptsSinceEnteringActive / NEW_CARD_BOOST_DURATION;
    score += NEW_CARD_BOOST_WEIGHT * decay;
  }

  const recent = cardProgress.recentResults;
  if (recent.length > 0 && recent[recent.length - 1] === 'w') {
    score += W_RECENT_MISS;
  }

  score += cardProgress.penalty * W_PENALTY;
  score += Math.max(0, MASTERY_TARGET - cardProgress.streak) * W_STREAK_GAP;

  // Freshness based on cardsShown distance proxy: clamp to 5 if no last-seen tick.
  // recentResults carries 'c'/'w' history but not absolute distance; spec uses
  // cardsAgoSeen (live in session). For CTX-06 we approximate: recently-graded
  // cards have a populated recentResults; we use 5 - min(recent.length,5) as a
  // crude freshness term so a card that hasn't been seen this session gets the
  // full bump. This keeps freshness > 0 without adding session-wide bookkeeping.
  const freshness = 5 - Math.min(recent.length, 5);
  score += freshness * W_FRESHNESS;

  return score;
}

// ---------------------------------------------------------------------------
// Selection — spec §10
// ---------------------------------------------------------------------------

function weightedRandomPick<T>(
  scored: Array<[T, number]>,
  rng: () => number,
): T {
  const total = scored.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) {
    return scored[Math.floor(rng() * scored.length)][0];
  }
  let r = rng() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= scored[i][1];
    if (r <= 0) return scored[i][0];
  }
  return scored[scored.length - 1][0];
}

function transientSession(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
): SessionState {
  const unmastered = cards.filter(
    (c) => !getProgressForCard(progress, c.id).mastered,
  );
  const seed = unmastered.length > 0 ? unmastered : cards;
  const activeSet = seed.slice(0, ACTIVE_SET_START).map((c) => c.id);

  return {
    startedAt: new Date().toISOString(),
    cardsShown: 0,
    recentGrades: [],
    inStruggleMode: false,
    consecutiveCorrectInSession: 0,
    previousCardId,
    twoBackCardId: null,
    activeSet,
    prePushedActiveSet: null,
  };
}

export function chooseNextCard(
  cards: LetterCard[],
  progress: ProgressByCard,
  previousCardId: string,
  session?: SessionState,
  rng: () => number = Math.random,
): LetterCard {
  const state = session ?? transientSession(cards, progress, previousCardId);
  const cardById = new Map<string, LetterCard>(cards.map((c) => [c.id, c]));

  // Resolve activeSet ids → LetterCard, dropping any ids that aren't on the path.
  const activeCards: LetterCard[] = state.activeSet
    .map((id) => cardById.get(id))
    .filter((c): c is LetterCard => c !== undefined);

  if (activeCards.length === 0) {
    // Defensive: fall back to any unmastered card on the path, else first card.
    const fallback = cards.find(
      (c) => !getProgressForCard(progress, c.id).mastered,
    );
    return fallback ?? cards[0];
  }

  if (activeCards.length === 1) {
    return activeCards[0];
  }

  const scored: Array<[LetterCard, number]> = activeCards.map((card) => [
    card,
    visibilityScore(card, getProgressForCard(progress, card.id), state),
  ]);
  const filtered = scored.filter(([, s]) => s > 0);

  if (filtered.length === 0) {
    const nonPrev = activeCards.find((c) => c.id !== state.previousCardId);
    return nonPrev ?? activeCards[0];
  }

  return weightedRandomPick(filtered, rng);
}
