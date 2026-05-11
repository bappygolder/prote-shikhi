import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  LETTER_CARDS,
  MASTERY_TARGET,
  PRACTICE_PRESETS,
  type LetterCard,
  type PracticePreset,
} from './data/banglaLetters';
import { ThemeProvider, useTheme, type ThemePreference } from './lib/theme';
import {
  applyActiveSetOnCorrect,
  applyActiveSetOnMastery,
  applyGrade,
  chooseNextCard,
  eligibleForSprinkle,
  getProgressForCard,
  getUnlockedCards,
  initSessionState,
  isPathComplete,
  isPresetComplete,
  maybeEnterStruggleMode,
  maybeExitStruggleMode,
  migrateProgress,
  pushBounded,
  resetCards,
  tickPostMasteryCounters,
  tickSprinkleCooldowns,
  RECENT_WINDOW,
  SPRINKLE_COOLDOWN,
  WARMUP_PER_CARD,
  type ProgressByCard,
  type ProgressState,
  type SessionState,
} from './lib/learning';

const STORAGE_KEY = 'porashikhi.progress.v1';
const LAST_TAB_STORAGE_KEY = 'porashikhi.lastTab.v1';
const HEATMAP_VISIBLE_KEY = 'porashikhi.ui.heatmap.visible.v1';
const LEGACY_STORAGE_KEY = 'bornomala.progress.v1';
const LEGACY_LAST_TAB_STORAGE_KEY = 'bornomala.lastTab.v1';
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const DEFAULT_PRESET = PRACTICE_PRESETS[0];
const APP_VERSION = `v${Constants.expoConfig?.version ?? '0.0.0'}`;
const LAST_UPDATED =
  (Constants.expoConfig?.extra as { lastUpdated?: string } | undefined)?.lastUpdated ?? '—';

const PERSISTED_TABS = ['path', 'letters', 'practice'] as const;
type PersistedTab = (typeof PERSISTED_TABS)[number];

function isPersistedTab(value: unknown): value is PersistedTab {
  return (
    typeof value === 'string' &&
    (PERSISTED_TABS as readonly string[]).includes(value)
  );
}

function confirmDestructiveAction(
  title: string,
  message: string,
  onConfirm: () => void,
) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'বাতিল', style: 'cancel' },
    { text: 'রিসেট', style: 'destructive', onPress: onConfirm },
  ]);
}

type AppTab = 'path' | 'letters' | 'practice';
type PracticeListId = 'unlocked' | 'all' | 'needsWork' | 'mastered';
type GradeFeedback = 'right' | 'wrong' | null;

type SessionStats = {
  attempts: number;
  correct: number;
  wrong: number;
};

type PracticeList = {
  id: PracticeListId;
  label: string;
};

type ProgressBarProps = {
  label: string;
  completed: number;
  total: number;
  percent: number;
};

type LetterProgressMarkProps = {
  completed: number;
  letter: string;
  percent: number;
  total: number;
};

const PRACTICE_LISTS: PracticeList[] = [
  { id: 'unlocked', label: 'খোলা' },
  { id: 'all', label: 'সব' },
  { id: 'needsWork', label: 'চর্চা' },
  { id: 'mastered', label: 'শেখা' },
];

const initialSessionStats: SessionStats = {
  attempts: 0,
  correct: 0,
  wrong: 0,
};

function toBanglaNumber(value: number | string) {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

function getMasteryPercent(progress: ProgressByCard, cardId: string) {
  const cardProgress = getProgressForCard(progress, cardId);

  return Math.min(
    100,
    Math.round((cardProgress.correctCount / MASTERY_TARGET) * 100),
  );
}

function getDisplayLetter(card: LetterCard) {
  return card.group === 'vowelSign' ? `◌${card.letter}` : card.letter;
}

function getPracticeCardsForList(
  listId: PracticeListId,
  presetCards: LetterCard[],
  progress: ProgressByCard,
  unlockedCards: LetterCard[],
) {
  if (listId === 'all') {
    return presetCards;
  }

  if (listId === 'needsWork') {
    return presetCards.filter(
      (card) => !getProgressForCard(progress, card.id).mastered,
    );
  }

  if (listId === 'mastered') {
    return presetCards.filter(
      (card) => getProgressForCard(progress, card.id).mastered,
    );
  }

  return unlockedCards;
}

function getEffectivePracticeCards(
  listId: PracticeListId,
  presetCards: LetterCard[],
  progress: ProgressByCard,
  unlockedCards: LetterCard[],
) {
  const listCards = getPracticeCardsForList(
    listId,
    presetCards,
    progress,
    unlockedCards,
  );

  return listCards.length > 0 ? listCards : unlockedCards;
}

function ProgressBar({ label, completed, total, percent }: ProgressBarProps) {
  const { styles } = useTheme();
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const clampedCompleted = Math.max(0, Math.min(total, completed));
  const animatedPercent = useRef(new Animated.Value(clampedPercent)).current;
  const fillWidth = animatedPercent.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const breakpoints = Array.from(
    { length: Math.max(0, total - 1) },
    (_, index) => `${((index + 1) / total) * 100}%` as `${number}%`,
  );
  const [displayPercent, setDisplayPercent] = useState(clampedPercent);

  useEffect(() => {
    Animated.timing(animatedPercent, {
      toValue: clampedPercent,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedPercent, clampedPercent]);

  useEffect(() => {
    const id = animatedPercent.addListener(({ value }) => {
      setDisplayPercent(Math.round(value));
    });
    return () => animatedPercent.removeListener(id);
  }, [animatedPercent]);

  return (
    <View style={styles.progressBlock}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View
        accessibilityLabel={`${label}: ${toBanglaNumber(clampedCompleted)} / ${toBanglaNumber(total)}`}
        accessibilityRole="progressbar"
        accessibilityValue={{
          max: total,
          min: 0,
          now: clampedCompleted,
          text: `${toBanglaNumber(clampedCompleted)}/${toBanglaNumber(total)} · ${toBanglaNumber(clampedPercent)}%`,
        }}
        style={styles.progressTrack}
      >
        <Animated.View style={[styles.progressFill, { width: fillWidth }]} />
        {breakpoints.map((left) => (
          <View
            key={left}
            pointerEvents="none"
            style={[styles.progressBreakpoint, { left }]}
          />
        ))}
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.progressValue}>
        {toBanglaNumber(displayPercent)}% · {toBanglaNumber(clampedCompleted)}/{toBanglaNumber(total)}
      </Text>
    </View>
  );
}

function LetterProgressMark({
  completed,
  letter,
  percent,
  total,
}: LetterProgressMarkProps) {
  const { styles } = useTheme();
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const clampedCompleted = Math.max(0, Math.min(total, completed));
  const animatedPercent = useRef(new Animated.Value(clampedPercent)).current;
  const fillWidth = animatedPercent.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const breakpoints = Array.from(
    { length: Math.max(0, total - 1) },
    (_, index) => `${((index + 1) / total) * 100}%` as `${number}%`,
  );

  useEffect(() => {
    Animated.timing(animatedPercent, {
      toValue: clampedPercent,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedPercent, clampedPercent]);

  return (
    <View style={styles.letterProgressMark}>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={styles.letterProgressGlyph}
      >
        {letter}
      </Text>
      <View style={styles.letterProgressBody}>
        <View style={styles.letterProgressTopRow}>
          <Text style={styles.letterProgressLabel}>এই অক্ষর</Text>
          <Text style={styles.letterProgressValue}>
            {toBanglaNumber(clampedCompleted)}/{toBanglaNumber(total)}
          </Text>
        </View>
        <View
          accessibilityLabel={`এই অক্ষর: ${toBanglaNumber(clampedCompleted)} / ${toBanglaNumber(total)}`}
          accessibilityRole="progressbar"
          accessibilityValue={{
            max: total,
            min: 0,
            now: clampedCompleted,
            text: `${toBanglaNumber(clampedCompleted)}/${toBanglaNumber(total)} · ${toBanglaNumber(clampedPercent)}%`,
          }}
          style={styles.letterProgressTrack}
        >
          <Animated.View
            style={[styles.letterProgressFill, { width: fillWidth }]}
          />
          {breakpoints.map((left) => (
            <View
              key={left}
              pointerEvents="none"
              style={[styles.letterProgressBreakpoint, { left }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

type UniverseHeatmapProps = {
  cards: LetterCard[];
  progress: ProgressByCard;
  onTapCard: (card: LetterCard) => void;
};

function UniverseHeatmap({ cards, progress, onTapCard }: UniverseHeatmapProps) {
  const { styles } = useTheme();
  return (
    <View style={styles.universeWrap}>
      <View style={styles.universeGrid}>
        {cards.map((card) => {
          const cardProgress = getProgressForCard(progress, card.id);
          const isMastered = cardProgress.mastered;
          const hasProgress = !isMastered && cardProgress.correctCount > 0;
          return (
            <Pressable
              accessibilityLabel={`${card.letter} অনুশীলন করুন`}
              hitSlop={2}
              key={card.id}
              onPress={() => onTapCard(card)}
              style={({ pressed }) => [
                styles.universeCell,
                hasProgress && styles.universeCellStarted,
                isMastered && styles.universeCellMastered,
                pressed && styles.universeCellPressed,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

type PresetNodeState = 'locked' | 'started' | 'mastered' | 'current';

type PresetPathProps = {
  presets: PracticePreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onSelect: (presetId: string) => void;
  onLongPressReset: (preset: PracticePreset) => void;
};

function PresetPath({
  presets,
  progress,
  currentPresetId,
  onSelect,
  onLongPressReset,
}: PresetPathProps) {
  const { styles } = useTheme();
  return (
    <View style={styles.pathColumn}>
      {presets.map((preset, index) => {
        const masteredCount = preset.cards.filter(
          (card) => getProgressForCard(progress, card.id).mastered,
        ).length;
        const totalCount = preset.cards.length;
        const isMastered = masteredCount === totalCount && totalCount > 0;
        const isCurrent = preset.id === currentPresetId;
        const hasStarted = !isMastered && masteredCount > 0;
        const state: PresetNodeState = isCurrent
          ? 'current'
          : isMastered
            ? 'mastered'
            : hasStarted
              ? 'started'
              : 'locked';

        // Zigzag offset: even rows lean right, odd rows lean left.
        const sideStyle = index % 2 === 0 ? styles.pathRowLeft : styles.pathRowRight;

        return (
          <View key={preset.id} style={[styles.pathRow, sideStyle]}>
            <Pressable
              accessibilityLabel={`${preset.label} প্রিসেট`}
              delayLongPress={420}
              onLongPress={() => onLongPressReset(preset)}
              onPress={() => onSelect(preset.id)}
              style={({ pressed }) => [
                styles.pathNode,
                state === 'started' && styles.pathNodeStarted,
                state === 'mastered' && styles.pathNodeMastered,
                state === 'current' && styles.pathNodeCurrent,
                state === 'locked' && styles.pathNodeLocked,
                pressed && styles.tilePressed,
              ]}
            >
              {state === 'mastered' ? (
                <Text style={styles.pathNodeTick}>✓</Text>
              ) : (
                <Text
                  style={[
                    styles.pathNodeGlyph,
                    state === 'current' && styles.pathNodeGlyphCurrent,
                    state === 'locked' && styles.pathNodeGlyphLocked,
                  ]}
                >
                  {preset.cards[0]?.letter ?? '·'}
                </Text>
              )}
            </Pressable>
            <View style={styles.pathLabelBlock}>
              <Text
                style={[
                  styles.pathLabel,
                  state === 'locked' && styles.pathLabelLocked,
                ]}
              >
                {preset.label}
              </Text>
              <Text
                style={[
                  styles.pathCount,
                  state === 'locked' && styles.pathCountLocked,
                ]}
              >
                {toBanglaNumber(masteredCount)}/{toBanglaNumber(totalCount)}
              </Text>
              {state === 'current' ? (
                <Pressable
                  accessibilityLabel={`${preset.label} শুরু করুন`}
                  onPress={() => onSelect(preset.id)}
                  style={({ pressed }) => [
                    styles.startPill,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.startPillText}>শুরু</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function App() {
  const { isDark, preference, setPreference, styles } = useTheme();
  const [progress, setProgress] = useState<ProgressByCard>({});
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    initialSessionStats,
  );
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [currentCardId, setCurrentCardId] = useState(DEFAULT_PRESET.cards[0].id);
  const [session, setSession] = useState<SessionState>(() =>
    initSessionState(DEFAULT_PRESET.cards, {}),
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<AppTab>('practice');
  const [selectedPracticeList, setSelectedPracticeList] =
    useState<PracticeListId>('unlocked');
  const [gradeFeedback, setGradeFeedback] = useState<GradeFeedback>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [heatmapVisible, setHeatmapVisible] = useState(true);
  const ambientMotion = useRef(new Animated.Value(0)).current;
  const cardEntrance = useRef(new Animated.Value(1)).current;
  const feedbackBurst = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LAST_TAB_STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_LAST_TAB_STORAGE_KEY),
      AsyncStorage.getItem(HEATMAP_VISIBLE_KEY),
    ])
      .then(async ([savedProgress, savedTab, legacyProgress, legacyTab, savedHeatmap]) => {
        if (!isMounted) {
          return;
        }

        // One-time migration from bornomala.* keys (pre-rebrand) to porashikhi.* keys.
        let progressToUse = savedProgress;
        let tabToUse = savedTab;
        if (!progressToUse && legacyProgress) {
          progressToUse = legacyProgress;
          await AsyncStorage.setItem(STORAGE_KEY, legacyProgress).catch(() => {});
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
          console.log('[porashikhi] migrated progress from bornomala.* keys');
        }
        if (!tabToUse && legacyTab) {
          tabToUse = legacyTab;
          await AsyncStorage.setItem(LAST_TAB_STORAGE_KEY, legacyTab).catch(() => {});
          await AsyncStorage.removeItem(LEGACY_LAST_TAB_STORAGE_KEY).catch(() => {});
        }

        if (progressToUse) {
          try {
            const parsed: unknown = JSON.parse(progressToUse);
            const state = migrateProgress(parsed);
            setProgress(state.byCard);
            setSession(initSessionState(DEFAULT_PRESET.cards, state.byCard));
          } catch (parseError) {
            console.warn('[porashikhi] Could not migrate stored progress, starting fresh.', parseError);
          }
        }

        if (isPersistedTab(tabToUse)) {
          setCurrentTab(tabToUse);
        }

        if (savedHeatmap !== null) {
          setHeatmapVisible(savedHeatmap !== 'false');
        }
      })
      .catch(() => {
        // The app still works if local progress cannot be read.
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    // Debounce writes so a flurry of grade taps coalesces into one save.
    const timer = setTimeout(() => {
      const toPersist: ProgressState = { schemaVersion: 2, byCard: progress };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist)).catch(() => {
        // Keep the trainer responsive even if storage fails.
      });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [isLoaded, progress]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    AsyncStorage.setItem(LAST_TAB_STORAGE_KEY, currentTab).catch(() => {
      // Tab persistence is a nice-to-have; ignore failures.
    });
  }, [currentTab, isLoaded]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientMotion, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ambientMotion, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [ambientMotion]);

  const selectedPreset =
    PRACTICE_PRESETS.find((preset) => preset.id === selectedPresetId) ??
    DEFAULT_PRESET;
  const selectedPresetCards = selectedPreset.cards;
  const unlockedCards = useMemo(
    () => getUnlockedCards(selectedPresetCards, progress),
    [progress, selectedPresetCards],
  );
  const practiceCards = useMemo(
    () =>
      getPracticeCardsForList(
        selectedPracticeList,
        selectedPresetCards,
        progress,
        unlockedCards,
      ),
    [progress, selectedPracticeList, selectedPresetCards, unlockedCards],
  );
  const effectivePracticeCards = useMemo(
    () =>
      getEffectivePracticeCards(
        selectedPracticeList,
        selectedPresetCards,
        progress,
        unlockedCards,
      ),
    [progress, selectedPracticeList, selectedPresetCards, unlockedCards],
  );

  useEffect(() => {
    const cardIsAvailable = effectivePracticeCards.some(
      (card) => card.id === currentCardId,
    );

    if (!cardIsAvailable) {
      setCurrentCardId(
        effectivePracticeCards[0]?.id ?? selectedPresetCards[0].id,
      );
    }
  }, [currentCardId, effectivePracticeCards, selectedPresetCards]);

  const currentCard =
    effectivePracticeCards.find((card) => card.id === currentCardId) ??
    effectivePracticeCards[0] ??
    selectedPresetCards[0];
  const currentDisplayLetter = getDisplayLetter(currentCard);
  const isCurrentVowelSign = currentCard.group === 'vowelSign';
  const currentProgress = getProgressForCard(progress, currentCard.id);
  const masteredCount = selectedPresetCards.filter(
    (card) => getProgressForCard(progress, card.id).mastered,
  ).length;
  const totalMasteryPercent = Math.round(
    (masteredCount / selectedPresetCards.length) * 100,
  );
  const currentMasteryPercent = getMasteryPercent(progress, currentCard.id);
  const sessionAccuracy =
    sessionStats.attempts === 0
      ? 0
      : Math.round((sessionStats.correct / sessionStats.attempts) * 100);
  const selectedListLabel =
    PRACTICE_LISTS.find((list) => list.id === selectedPracticeList)?.label ??
    PRACTICE_LISTS[0].label;
  const stageLabel =
    currentTab === 'practice'
      ? `${selectedPreset.label} · ${selectedListLabel}`
      : currentTab === 'path'
        ? 'শেখার পথ'
        : selectedPreset.label;
  const currentPathPresetId =
    PRACTICE_PRESETS.find(
      (preset) => !isPresetComplete(preset.cards, progress),
    )?.id ?? null;
  const practiceListCounts: Record<PracticeListId, number> = {
    unlocked: unlockedCards.length,
    all: selectedPresetCards.length,
    needsWork: selectedPresetCards.filter(
      (card) => !getProgressForCard(progress, card.id).mastered,
    ).length,
    mastered: selectedPresetCards.filter(
      (card) => getProgressForCard(progress, card.id).mastered,
    ).length,
  };
  const ambientLift = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const ambientDrop = ambientMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 3],
  });
  const cardAnimatedStyle = {
    opacity: cardEntrance,
    transform: [
      {
        translateY: cardEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: cardEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };
  const feedbackAnimatedStyle = {
    opacity: feedbackBurst,
    transform: [
      {
        translateY: feedbackBurst.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: feedbackBurst.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
      },
    ],
  };
  const menuTranslateX = menuSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [360, 0],
  });

  useEffect(() => {
    cardEntrance.setValue(0);
    Animated.spring(cardEntrance, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [cardEntrance, currentCard.id]);

  const keyboardStateRef = useRef({ currentTab, isMenuOpen });
  useEffect(() => {
    keyboardStateRef.current = { currentTab, isMenuOpen };
  });
  const handleGradeRef = useRef(handleGrade);
  useEffect(() => {
    handleGradeRef.current = handleGrade;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const s = keyboardStateRef.current;
      if (s.currentTab !== 'practice' || s.isMenuOpen) return;
      if (e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleGradeRef.current(true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleGradeRef.current(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleOpenMenu() {
    setIsMenuOpen(true);
    menuSlide.setValue(0);
    Animated.timing(menuSlide, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function handleCloseMenu() {
    setShowInfoTooltip(false);
    Animated.timing(menuSlide, {
      toValue: 0,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsMenuOpen(false);
    });
  }

  function playFeedback(wasCorrect: boolean) {
    setGradeFeedback(wasCorrect ? 'right' : 'wrong');
    feedbackBurst.stopAnimation();
    feedbackBurst.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackBurst, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(feedbackBurst, {
        toValue: 0,
        delay: 360,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setGradeFeedback(null);
      }
    });
  }

  function handleGrade(wasCorrect: boolean) {
    const wasPathCompleteBefore = isPathComplete(selectedPresetCards, progress);
    const current = getProgressForCard(progress, currentCard.id);
    const gradedProgress = applyGrade(progress, currentCard.id, wasCorrect);
    // Spec §7: every grade bumps cardsShownSinceMastered for all mastered cards.
    const nextProgress = tickPostMasteryCounters(gradedProgress);
    const nextCardProgress = getProgressForCard(nextProgress, currentCard.id);

    const wasFirstCountedCorrect =
      wasCorrect &&
      current.correctCount === WARMUP_PER_CARD &&
      nextCardProgress.correctCount === WARMUP_PER_CARD + 1;
    const wasJustMastered = !current.mastered && nextCardProgress.mastered;

    let nextSession: SessionState = {
      ...session,
      recentGrades: pushBounded(
        session.recentGrades,
        wasCorrect ? 'c' : 'w',
        RECENT_WINDOW,
      ),
      consecutiveCorrectInSession: wasCorrect
        ? session.consecutiveCorrectInSession + 1
        : 0,
    };

    let progressForSelection = nextProgress;
    const beforeUnlockSize = nextSession.activeSet.length;

    if (wasFirstCountedCorrect) {
      nextSession = applyActiveSetOnCorrect(
        nextSession,
        currentCard.id,
        nextCardProgress,
        selectedPresetCards,
      );
    }
    if (wasJustMastered) {
      nextSession = applyActiveSetOnMastery(
        nextSession,
        currentCard.id,
        selectedPresetCards,
      );
    }

    // Reset newcomer counters for any newly-appended active card.
    if (nextSession.activeSet.length > beforeUnlockSize) {
      const entrantId = nextSession.activeSet[nextSession.activeSet.length - 1];
      const entrantProgress = getProgressForCard(progressForSelection, entrantId);
      progressForSelection = {
        ...progressForSelection,
        [entrantId]: {
          ...entrantProgress,
          attemptsSinceEnteringActive: 0,
          enteredActiveAt: new Date().toISOString(),
        },
      };
    }

    nextSession = wasCorrect
      ? maybeExitStruggleMode(nextSession, selectedPresetCards)
      : maybeEnterStruggleMode(
          nextSession,
          progressForSelection,
          selectedPresetCards,
        );

    // On the default unlocked list, drive selection from the new SessionState.
    // On the other practice lists, preserve v1 behavior (no session) so the
    // visible behavior outside the unlocked flow is unchanged.
    let chosen;
    if (selectedPracticeList === 'unlocked') {
      chosen = chooseNextCard(
        selectedPresetCards,
        progressForSelection,
        currentCard.id,
        nextSession,
      );
    } else {
      const nextUnlockedCards = getUnlockedCards(
        selectedPresetCards,
        progressForSelection,
      );
      const nextPracticeCards = getEffectivePracticeCards(
        selectedPracticeList,
        selectedPresetCards,
        progressForSelection,
        nextUnlockedCards,
      );
      chosen = chooseNextCard(
        nextPracticeCards,
        progressForSelection,
        currentCard.id,
      );
    }

    // Bump chosen card's attemptsSinceEnteringActive (spec §10).
    const chosenProgress = getProgressForCard(progressForSelection, chosen.id);

    // Sprinkle bookkeeping (spec §12). A mastered card that surfaces is the
    // sprinkle event; reset its cooldown. Tick other mastered cards' cooldowns.
    const chosenIsSprinkle =
      chosenProgress.mastered &&
      eligibleForSprinkle(chosenProgress, nextSession);
    const sprinkledChosenProgress = chosenIsSprinkle
      ? { ...chosenProgress, sprinkleCooldown: SPRINKLE_COOLDOWN }
      : chosenProgress;

    const tickedProgress = tickSprinkleCooldowns(
      progressForSelection,
      chosen.id,
    );

    const finalProgress: ProgressByCard = {
      ...tickedProgress,
      [chosen.id]: {
        ...sprinkledChosenProgress,
        attemptsSinceEnteringActive:
          sprinkledChosenProgress.attemptsSinceEnteringActive + 1,
      },
    };

    nextSession = {
      ...nextSession,
      twoBackCardId: nextSession.previousCardId,
      previousCardId: chosen.id,
      cardsShown: nextSession.cardsShown + 1,
    };

    if (
      isPathComplete(selectedPresetCards, finalProgress) &&
      !wasPathCompleteBefore
    ) {
      console.log('[porashikhi] path complete:', selectedPreset.id);
    }

    playFeedback(wasCorrect);
    setProgress(finalProgress);
    setSession(nextSession);
    setCurrentCardId(chosen.id);
    setSessionStats((c) => ({
      attempts: c.attempts + 1,
      correct: c.correct + (wasCorrect ? 1 : 0),
      wrong: c.wrong + (wasCorrect ? 0 : 1),
    }));
  }

  function handleReset() {
    confirmDestructiveAction(
      'পুরো অ্যাপ রিসেট',
      'পুরো অ্যাপ রিসেট করবেন? সব অগ্রগতি মুছে যাবে।',
      () => {
        setProgress({});
        setSession(initSessionState(DEFAULT_PRESET.cards, {}));
        setSessionStats(initialSessionStats);
        setSelectedPresetId(DEFAULT_PRESET.id);
        setCurrentCardId(DEFAULT_PRESET.cards[0].id);
        setSelectedPracticeList('unlocked');
        setCurrentTab('practice');
        setIsMenuOpen(false);
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
          // Reset still updates the current screen even if storage cleanup fails.
        });
      },
    );
  }

  function handleResetLetter(card: LetterCard) {
    confirmDestructiveAction(
      'অক্ষর রিসেট',
      `"${card.letter}"-এর অগ্রগতি মুছে ফেলবেন?`,
      () => setProgress((current) => resetCards(current, [card.id])),
    );
  }

  function handleResetPreset(preset: PracticePreset) {
    confirmDestructiveAction(
      'তালিকা রিসেট',
      `"${preset.label}"-এর সব অক্ষরের অগ্রগতি মুছে ফেলবেন?`,
      () =>
        setProgress((current) =>
          resetCards(
            current,
            preset.cards.map((card) => card.id),
          ),
        ),
    );
  }

  function handleSelectPracticeList(listId: PracticeListId) {
    const nextCards = getEffectivePracticeCards(
      listId,
      selectedPresetCards,
      progress,
      unlockedCards,
    );

    setSelectedPracticeList(listId);
    setCurrentCardId(nextCards[0]?.id ?? selectedPresetCards[0].id);
  }

  function handleSelectPreset(presetId: string) {
    const preset =
      PRACTICE_PRESETS.find((practicePreset) => practicePreset.id === presetId) ??
      DEFAULT_PRESET;
    const nextUnlockedCards = getUnlockedCards(preset.cards, progress);
    const nextCards = getEffectivePracticeCards(
      selectedPracticeList,
      preset.cards,
      progress,
      nextUnlockedCards,
    );

    setSelectedPresetId(preset.id);
    setSession(initSessionState(preset.cards, progress));
    setCurrentCardId(nextCards[0]?.id ?? preset.cards[0].id);
    setCurrentTab('practice');
    handleCloseMenu();
  }

  function handleChooseLetter(card: LetterCard) {
    const isInCurrentPracticeList = practiceCards.some(
      (practiceCard) => practiceCard.id === card.id,
    );

    if (!isInCurrentPracticeList) {
      setSelectedPracticeList('all');
    }

    const nextPreset = PRACTICE_PRESETS.find((preset) =>
      preset.cards.some((presetCard) => presetCard.id === card.id),
    );

    if (nextPreset && nextPreset.id !== selectedPresetId) {
      setSelectedPresetId(nextPreset.id);
    }

    setCurrentCardId(card.id);
    setCurrentTab('practice');
  }

  if (!isLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />

          <View style={styles.headerSpacer} />
        </View>

        {currentTab === 'path' ? (
          <View style={styles.pathScreen}>
            <View style={styles.pathHeatmapRow}>
              <View style={styles.pathHeatmapLine} />
              <Pressable
                accessibilityLabel={heatmapVisible ? 'Hide map' : 'Show map'}
                onPress={() => {
                  const next = !heatmapVisible;
                  setHeatmapVisible(next);
                  AsyncStorage.setItem(HEATMAP_VISIBLE_KEY, String(next)).catch(() => {});
                }}
                style={({ pressed }) => [styles.heatmapToggle, pressed && styles.buttonPressed]}
              >
                {!heatmapVisible ? <Text style={styles.heatmapToggleIcon}>👁️</Text> : null}
                <Text style={styles.heatmapToggleLabel}>{heatmapVisible ? 'Hide map' : 'Show map'}</Text>
              </Pressable>
            </View>
            {heatmapVisible ? (
              <UniverseHeatmap
                cards={LETTER_CARDS}
                progress={progress}
                onTapCard={handleChooseLetter}
              />
            ) : null}
            <ScrollView
              contentContainerStyle={styles.pathScrollContent}
              showsVerticalScrollIndicator={false}
              style={styles.pathScroll}
            >
              <PresetPath
                presets={PRACTICE_PRESETS}
                progress={progress}
                currentPresetId={currentPathPresetId}
                onSelect={handleSelectPreset}
                onLongPressReset={handleResetPreset}
              />
            </ScrollView>
          </View>
        ) : currentTab === 'practice' ? (
          <View style={styles.practiceContent}>
            <View style={styles.progressStack}>
              <ProgressBar
                completed={masteredCount}
                label="মোট শেখা"
                percent={totalMasteryPercent}
                total={selectedPresetCards.length}
              />
            </View>

            <Animated.View style={[styles.card, cardAnimatedStyle]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.cardAccent,
                  styles.cardAccentTop,
                  {
                    transform: [
                      { translateY: ambientLift },
                      { rotate: '-16deg' },
                    ],
                  },
                ]}
              />
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.cardAccent,
                  styles.cardAccentBottom,
                  {
                    transform: [
                      { translateY: ambientDrop },
                      { rotate: '14deg' },
                    ],
                  },
                ]}
              />
              <View style={styles.glyphZone}>
                <Text
                  style={[
                    styles.letter,
                    isCurrentVowelSign && styles.vowelSignLetter,
                  ]}
                >
                  {currentDisplayLetter}
                </Text>
              </View>
              <View style={[styles.stripZone, { opacity: currentProgress.correctCount === 0 ? 0.1 : 1 }]}>
                <LetterProgressMark
                  completed={currentProgress.correctCount}
                  letter={currentDisplayLetter}
                  percent={currentMasteryPercent}
                  total={MASTERY_TARGET}
                />
              </View>
              {gradeFeedback ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.feedbackBadge,
                    gradeFeedback === 'right'
                      ? styles.feedbackRight
                      : styles.feedbackWrong,
                    feedbackAnimatedStyle,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      gradeFeedback === 'right'
                        ? styles.feedbackRightText
                        : styles.feedbackWrongText,
                    ]}
                  >
                    {gradeFeedback === 'right' ? 'ঠিক' : 'আবার'}
                  </Text>
                </Animated.View>
              ) : null}
            </Animated.View>

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="ভুল হয়েছে"
                onPress={() => handleGrade(false)}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.wrongButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.actionText, styles.wrongText]}>ভুল</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="ঠিক হয়েছে"
                onPress={() => handleGrade(true)}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.rightButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={[styles.actionText, styles.rightText]}>ঠিক</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.lettersScreen}>
            <View style={styles.lettersTopRow}>
              <Text style={styles.lettersTitle}>
                {'অক্ষর · '}
                {toBanglaNumber(masteredCount)}/{toBanglaNumber(selectedPresetCards.length)}
                {' শেখা · '}
                {selectedPreset.label}
              </Text>
            </View>

            <View>
              <View style={styles.practiceListRow}>
                {PRACTICE_LISTS.filter((l) => l.id === 'unlocked' || l.id === 'all').map((list) => {
                  const isActive = selectedPracticeList === list.id;
                  const count = practiceListCounts[list.id];
                  const isDisabled = count === 0;

                  return (
                    <Pressable
                      accessibilityLabel={`${list.label} তালিকা`}
                      disabled={isDisabled}
                      key={list.id}
                      onPress={() => handleSelectPracticeList(list.id)}
                      style={({ pressed }) => [
                        styles.practiceListButton,
                        isActive && styles.practiceListButtonActive,
                        isDisabled && styles.practiceListButtonDisabled,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.practiceListText,
                          isActive && styles.practiceListTextActive,
                        ]}
                      >
                        {list.label}
                      </Text>
                      <Text
                        style={[
                          styles.practiceListCount,
                          isActive && styles.practiceListCountActive,
                        ]}
                      >
                        {toBanglaNumber(count)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedPracticeList === 'unlocked' ? (
                <Text style={styles.practiceListHint}>এই অক্ষরগুলো এখন শেখা হচ্ছে</Text>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={styles.letterGrid}
              showsVerticalScrollIndicator={false}
              style={styles.letterGridScroll}
            >
              {selectedPresetCards.map((card) => {
                const masteryPercent = getMasteryPercent(progress, card.id);
                const isCurrentCard = currentCard.id === card.id;
                const isMastered = masteryPercent >= 100;
                const hasProgress = masteryPercent > 0 && !isMastered;
                const displayLetter = getDisplayLetter(card);

                return (
                  <Pressable
                    accessibilityLabel={`${card.letter} প্র্যাকটিস করুন`}
                    key={card.id}
                    onPress={() => handleChooseLetter(card)}
                    onLongPress={() => handleResetLetter(card)}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.letterTile,
                      hasProgress && styles.letterTileStarted,
                      isMastered && styles.letterTileMastered,
                      isCurrentCard && styles.letterTileActive,
                      pressed && styles.tilePressed,
                    ]}
                  >
                    <Text
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      style={styles.letterTileLetter}
                    >
                      {displayLetter}
                    </Text>
                    <Text style={[
                      styles.letterPercent,
                      isMastered ? styles.letterPercentMastered : !hasProgress ? styles.letterPercentUntouched : undefined,
                    ]}>
                      {toBanglaNumber(masteryPercent)}%
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>


      <View style={styles.bottomNav}>
        <Pressable
          accessibilityLabel="শেখার পথ দেখুন"
          onPress={() => setCurrentTab('path')}
          style={({ pressed }) => [
            styles.bottomTab,
            currentTab === 'path' && styles.bottomTabActive,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.bottomTabIcon,
              currentTab === 'path' && styles.bottomTabIconActive,
            ]}
          >
            〰
          </Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={[
              styles.bottomTabText,
              currentTab === 'path' && styles.bottomTabTextActive,
            ]}
          >
            শেখার পথ
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="সব অক্ষর দেখুন"
          onPress={() => setCurrentTab('letters')}
          style={({ pressed }) => [
            styles.bottomTab,
            currentTab === 'letters' && styles.bottomTabActive,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.bottomTabIcon,
              currentTab === 'letters' && styles.bottomTabIconActive,
            ]}
          >
            অ
          </Text>
          <Text
            style={[
              styles.bottomTabText,
              currentTab === 'letters' && styles.bottomTabTextActive,
            ]}
          >
            অক্ষর
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="শিখি স্ক্রিনে যান"
          onPress={() => setCurrentTab('practice')}
          style={({ pressed }) => [
            styles.bottomTab,
            currentTab === 'practice' && styles.bottomTabActive,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.bottomTabIcon,
              currentTab === 'practice' && styles.bottomTabIconActive,
            ]}
          >
            ▶
          </Text>
          <Text
            style={[
              styles.bottomTabText,
              currentTab === 'practice' && styles.bottomTabTextActive,
            ]}
          >
            শিখি
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="মেনু খুলুন"
          onPress={handleOpenMenu}
          style={({ pressed }) => [
            styles.bottomTab,
            isMenuOpen && styles.bottomTabActive,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.bottomTabIcon,
              isMenuOpen && styles.bottomTabIconActive,
            ]}
          >
            ☰
          </Text>
          <Text
            style={[
              styles.bottomTabText,
              isMenuOpen && styles.bottomTabTextActive,
            ]}
          >
            মেনু
          </Text>
        </Pressable>
      </View>

      {isMenuOpen ? (
        <View style={styles.menuLayer}>
          <Pressable
            accessibilityLabel="মেনু বন্ধ করুন"
            onPress={handleCloseMenu}
            style={StyleSheet.absoluteFill}
          >
            <Animated.View
              style={[styles.menuBackdrop, { opacity: menuSlide }]}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.menuPanel,
              { transform: [{ translateX: menuTranslateX }] },
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>মেনু</Text>
              <Pressable
                accessibilityLabel="মেনু বন্ধ করুন"
                onPress={handleCloseMenu}
                style={({ pressed }) => [
                  styles.closeIconButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.closeIconText}>✕</Text>
              </Pressable>
            </View>

            {showInfoTooltip && (
              <Pressable
                style={[StyleSheet.absoluteFill, { zIndex: 10 }]}
                onPress={() => setShowInfoTooltip(false)}
              />
            )}

            <ScrollView
              contentContainerStyle={styles.menuScrollContent}
              showsVerticalScrollIndicator={false}
              style={styles.menuScroll}
            >
              <View style={styles.menuList}>
                <View style={styles.menuItem}>
                  <Text style={styles.menuLabel}>থিম</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['system', 'light', 'dark'] as ThemePreference[]).map((p) => (
                      <Pressable
                        key={p}
                        onPress={() => setPreference(p)}
                        style={[styles.themeChip, preference === p && styles.themeChipActive]}
                      >
                        <Text style={[styles.themeChipText, preference === p && styles.themeChipTextActive]}>
                          {p === 'system' ? '🌗' : p === 'light' ? '☀️' : '🌙'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.menuItem}>
                  <Text style={styles.menuLabel}>প্রিসেট</Text>
                  <Text style={styles.menuValue}>{selectedPreset.label}</Text>
                </View>
                <View style={styles.menuItem}>
                  <Text style={styles.menuLabel}>তালিকা</Text>
                  <Text style={styles.menuValue}>{selectedListLabel}</Text>
                </View>
              </View>

              <View style={styles.collapsibleSection}>
                <Pressable
                  accessibilityLabel="পরিসংখ্যান মেনু"
                  onPress={() => setIsStatsExpanded(!isStatsExpanded)}
                  style={styles.collapsibleHeader}
                >
                  <Text style={styles.collapsibleTitle}>পরিসংখ্যান</Text>
                  <Text style={styles.collapsibleIcon}>
                    {isStatsExpanded ? '▼' : '▶'}
                  </Text>
                </Pressable>
                {isStatsExpanded && (
                  <View style={styles.collapsibleContent}>
                    <View style={styles.menuItem}>
                      <Text style={styles.menuLabel}>খোলা অক্ষর</Text>
                      <Text style={styles.menuValue}>
                        {toBanglaNumber(unlockedCards.length)}/
                        {toBanglaNumber(selectedPresetCards.length)}
                      </Text>
                    </View>
                    <View style={styles.menuItem}>
                      <Text style={styles.menuLabel}>সেশন</Text>
                      <Text style={styles.menuValue}>
                        {toBanglaNumber(sessionStats.attempts)}
                      </Text>
                    </View>
                    <View style={styles.menuItem}>
                      <Text style={styles.menuLabel}>ঠিক</Text>
                      <Text style={styles.menuValue}>
                        {toBanglaNumber(sessionStats.correct)}
                      </Text>
                    </View>
                    <View style={styles.menuItem}>
                      <Text style={styles.menuLabel}>ভুল</Text>
                      <Text style={styles.menuValue}>
                        {toBanglaNumber(sessionStats.wrong)}
                      </Text>
                    </View>
                    <View style={styles.menuItem}>
                      <Text style={styles.menuLabel}>ঠিকের হার</Text>
                      <Text style={styles.menuValue}>
                        {toBanglaNumber(sessionAccuracy)}%
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <Pressable
                accessibilityLabel="আবার শুরু করুন"
                onPress={handleReset}
                style={({ pressed }) => [
                  styles.resetButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.resetText}>আবার শুরু</Text>
              </Pressable>

              <View style={styles.footerContainer}>
                <Text style={styles.footerText}>
                  {'Built by '}
                  <Text
                    onPress={() => Linking.openURL('https://www.linkedin.com/in/bappygolder/')}
                    style={styles.footerLink}
                  >
                    Bappy Golder
                  </Text>
                </Text>
                <Text style={styles.footerText}>
                  {'Powered by '}
                  <Text
                    onPress={() => Linking.openURL('https://olab.com.au/')}
                    style={styles.footerLink}
                  >
                    oLab
                  </Text>
                </Text>
                <Text style={styles.footerVersion}>{APP_VERSION}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function AppRoot() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

