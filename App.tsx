import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  applyGrade,
  chooseNextCard,
  getProgressForCard,
  getUnlockedCards,
  isPresetComplete,
  resetCards,
  type ProgressByCard,
} from './lib/learning';

const STORAGE_KEY = 'bornomala.progress.v1';
const LAST_TAB_STORAGE_KEY = 'bornomala.lastTab.v1';
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const DEFAULT_PRESET = PRACTICE_PRESETS[0];
const APP_VERSION = 'v1.1.1';
const LAST_UPDATED = 'Monday, 4 May 2026';

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
        {toBanglaNumber(clampedCompleted)}/{toBanglaNumber(total)}
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

export default function App() {
  const [progress, setProgress] = useState<ProgressByCard>({});
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    initialSessionStats,
  );
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [currentCardId, setCurrentCardId] = useState(DEFAULT_PRESET.cards[0].id);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<AppTab>('practice');
  const [selectedPracticeList, setSelectedPracticeList] =
    useState<PracticeListId>('unlocked');
  const [gradeFeedback, setGradeFeedback] = useState<GradeFeedback>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const ambientMotion = useRef(new Animated.Value(0)).current;
  const cardEntrance = useRef(new Animated.Value(1)).current;
  const feedbackBurst = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LAST_TAB_STORAGE_KEY),
    ])
      .then(([savedProgress, savedTab]) => {
        if (!isMounted) {
          return;
        }

        if (savedProgress) {
          try {
            const parsed: unknown = JSON.parse(savedProgress);
            if (
              parsed !== null &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed)
            ) {
              setProgress(parsed as ProgressByCard);
            } else {
              console.warn('[bornomala] Stored progress had unexpected shape, ignoring.');
            }
          } catch (parseError) {
            console.warn('[bornomala] Could not parse stored progress, starting fresh.', parseError);
          }
        }

        if (isPersistedTab(savedTab)) {
          setCurrentTab(savedTab);
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
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => {
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
    const nextProgress = applyGrade(progress, currentCard.id, wasCorrect);
    const nextUnlockedCards = getUnlockedCards(selectedPresetCards, nextProgress);
    const nextPracticeCards = getEffectivePracticeCards(
      selectedPracticeList,
      selectedPresetCards,
      nextProgress,
      nextUnlockedCards,
    );
    const nextCard = chooseNextCard(
      nextPracticeCards,
      nextProgress,
      currentCard.id,
    );

    playFeedback(wasCorrect);
    setProgress(nextProgress);
    setCurrentCardId(nextCard.id);
    setSessionStats((current) => ({
      attempts: current.attempts + 1,
      correct: current.correct + (wasCorrect ? 1 : 0),
      wrong: current.wrong + (wasCorrect ? 0 : 1),
    }));
  }

  function handleReset() {
    confirmDestructiveAction(
      'পুরো অ্যাপ রিসেট',
      'পুরো অ্যাপ রিসেট করবেন? সব অগ্রগতি মুছে যাবে।',
      () => {
        setProgress({});
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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />

          <View style={styles.titleBlock}>
            <Text style={styles.brand}>পড়তে শিখি</Text>
            <Text style={styles.stage}>{stageLabel}</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {currentTab === 'path' ? (
          <View style={styles.pathScreen}>
            <UniverseHeatmap
              cards={LETTER_CARDS}
              progress={progress}
              onTapCard={handleChooseLetter}
            />
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
              <View style={styles.stripZone}>
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
              <View>
                <Text style={styles.lettersTitle}>অক্ষর</Text>
                <Text style={styles.lettersMeta}>
                  {toBanglaNumber(masteredCount)}/
                  {toBanglaNumber(selectedPresetCards.length)} শেখা
                </Text>
              </View>
              <View style={styles.lettersCountBadge}>
                <Text style={styles.lettersCountText}>
                  {toBanglaNumber(selectedPresetCards.length)}
                </Text>
              </View>
            </View>

            <View style={styles.practiceListRow}>
              {PRACTICE_LISTS.map((list) => {
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
                    <Text style={styles.letterPercent}>
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
            ⇡
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

              <View style={[styles.footerContainer, { zIndex: 20 }]}>
                <Text style={styles.footerText}>
                  Built by{' '}
                  <Text
                    onPress={() => Linking.openURL('https://www.linkedin.com/in/bappygolder/')}
                    style={styles.footerLink}
                  >
                    Bappy Golder
                  </Text>
                </Text>
                <View style={styles.poweredByRow}>
                  <Text style={styles.footerText}>
                    powered by{' '}
                    <Text
                      onPress={() => Linking.openURL('https://olab.com.au/')}
                      style={styles.footerLink}
                    >
                      oLab
                    </Text>
                  </Text>
                  <Text style={styles.footerVersion}>{APP_VERSION}</Text>
                  <Pressable
                    onPress={() => setShowInfoTooltip(!showInfoTooltip)}
                    style={styles.infoIconContainer}
                  >
                    <Text style={styles.infoIcon}>ⓘ</Text>
                  </Pressable>
                </View>
                {showInfoTooltip && (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipLabel}>LAST UPDATED</Text>
                    <Text style={styles.tooltipValue}>{LAST_UPDATED}</Text>
                    <View style={styles.tooltipDivider} />
                    <Text style={styles.tooltipVersion}>{APP_VERSION}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f3e8',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 44,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  brand: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  stage: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  practiceContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 16,
  },
  progressStack: {
    gap: 8,
    marginTop: -2,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 32,
  },
  progressLabel: {
    color: '#8b8790',
    width: 68,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  progressValue: {
    color: '#8b8790',
    flexShrink: 0,
    width: 42,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'right',
  },
  progressTrack: {
    position: 'relative',
    flex: 1,
    height: 20,
    overflow: 'hidden',
    borderColor: '#e8deca',
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#fbf6e9',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#88d4c9',
  },
  progressBreakpoint: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 1,
    backgroundColor: 'rgba(143, 130, 105, 0.18)',
  },
  card: {
    flex: 1,
    minHeight: 250,
    flexDirection: 'column',
    overflow: 'hidden',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingBottom: 26,
    paddingTop: 26,
  },
  glyphZone: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripZone: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  cardAccent: {
    position: 'absolute',
    width: 104,
    height: 10,
    borderRadius: 5,
    opacity: 0.5,
  },
  cardAccentTop: {
    top: 24,
    left: -28,
    backgroundColor: '#f59e0b',
  },
  cardAccentBottom: {
    right: -24,
    bottom: 30,
    backgroundColor: '#14b8a6',
  },
  letter: {
    color: '#111827',
    fontSize: 168,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
  vowelSignLetter: {
    fontSize: 140,
  },
  letterProgressMark: {
    width: '82%',
    maxWidth: 320,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderColor: '#ece5d5',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fffdf7',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  letterProgressGlyph: {
    color: '#b9b2a6',
    width: 42,
    fontSize: 32,
    fontWeight: '900',
    includeFontPadding: true,
    letterSpacing: 0,
    lineHeight: 48,
    textAlign: 'center',
  },
  letterProgressBody: {
    flex: 1,
    gap: 6,
  },
  letterProgressTopRow: {
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  letterProgressLabel: {
    color: '#8b8790',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  letterProgressValue: {
    color: '#8b8790',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  letterProgressTrack: {
    position: 'relative',
    height: 18,
    overflow: 'hidden',
    borderColor: '#e5ddc7',
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: '#f8f1e3',
  },
  letterProgressFill: {
    height: '100%',
    borderRadius: 9,
    backgroundColor: '#f97316',
  },
  letterProgressBreakpoint: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 1,
    backgroundColor: 'rgba(143, 130, 105, 0.18)',
  },
  feedbackBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  feedbackRight: {
    borderColor: '#86efac',
    backgroundColor: '#ecfdf3',
  },
  feedbackWrong: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  feedbackRightText: {
    color: '#047857',
  },
  feedbackWrongText: {
    color: '#c2410c',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  wrongButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  rightButton: {
    borderColor: '#bbf7d0',
    backgroundColor: '#ecfdf3',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  actionText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  wrongText: {
    color: '#be123c',
  },
  rightText: {
    color: '#047857',
  },
  lettersScreen: {
    flex: 1,
    gap: 14,
  },
  lettersTopRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  lettersTitle: {
    color: '#111827',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  lettersMeta: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    marginTop: 2,
  },
  lettersCountBadge: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#bae6fd',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#eff6ff',
  },
  lettersCountText: {
    color: '#1d4ed8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  practiceListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  practiceListButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderColor: '#e5ddc7',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fffaf0',
    paddingHorizontal: 12,
  },
  practiceListButtonActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  practiceListButtonDisabled: {
    opacity: 0.42,
  },
  practiceListText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  practiceListTextActive: {
    color: '#ffffff',
  },
  practiceListCount: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  practiceListCountActive: {
    color: '#facc15',
  },
  letterGridScroll: {
    flex: 1,
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 8,
  },
  letterTile: {
    width: '31.4%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#e5ddc7',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  letterTileStarted: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  letterTileMastered: {
    borderColor: '#bbf7d0',
    backgroundColor: '#ecfdf3',
  },
  letterTileActive: {
    borderColor: '#111827',
    borderWidth: 2,
  },
  tilePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  letterTileLetter: {
    color: '#111827',
    fontSize: 50,
    fontWeight: '800',
    includeFontPadding: true,
    letterSpacing: 0,
    lineHeight: 76,
    textAlign: 'center',
  },
  letterPercent: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pathScreen: {
    flex: 1,
    gap: 14,
  },
  universeWrap: {
    borderColor: '#ece5d5',
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#fffdf7',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  universeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  universeCell: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#e5ddc7',
    backgroundColor: '#ffffff',
  },
  universeCellStarted: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  universeCellMastered: {
    borderColor: '#86efac',
    backgroundColor: '#86efac',
  },
  universeCellPressed: {
    opacity: 0.6,
  },
  pathScroll: {
    flex: 1,
  },
  pathScrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  pathColumn: {
    gap: 14,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pathRowLeft: {
    paddingLeft: 12,
    justifyContent: 'flex-start',
  },
  pathRowRight: {
    paddingLeft: 96,
    justifyContent: 'flex-start',
  },
  pathNode: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#e5ddc7',
    backgroundColor: '#ffffff',
  },
  pathNodeLocked: {
    opacity: 0.55,
  },
  pathNodeStarted: {
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
  },
  pathNodeMastered: {
    borderColor: '#86efac',
    backgroundColor: '#ecfdf3',
  },
  pathNodeCurrent: {
    borderColor: '#111827',
    borderWidth: 3,
    backgroundColor: '#fffbeb',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  pathNodeGlyph: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: 'center',
  },
  pathNodeGlyphCurrent: {
    color: '#f4512a',
  },
  pathNodeGlyphLocked: {
    color: '#9ca3af',
  },
  pathNodeTick: {
    color: '#047857',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  pathLabelBlock: {
    flex: 1,
    gap: 2,
  },
  pathLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  pathLabelLocked: {
    color: '#9ca3af',
  },
  pathCount: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  pathCountLocked: {
    color: '#b8b8b8',
  },
  startPill: {
    alignSelf: 'flex-start',
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#f4512a',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 4,
  },
  startPillText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bottomNav: {
    width: '92%',
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    borderColor: '#e5e7eb',
    borderRadius: 34,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    marginBottom: 14,
    padding: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  bottomTab: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 28,
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  bottomTabActive: {
    backgroundColor: '#f1f1f1',
  },
  bottomTabIcon: {
    color: '#6f7080',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 32,
  },
  bottomTabIconActive: {
    color: '#f4512a',
  },
  bottomTabText: {
    color: '#6f7080',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 21,
  },
  bottomTabTextActive: {
    color: '#f4512a',
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.38)',
  },
  menuPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '78%',
    maxWidth: 340,
    borderLeftColor: '#e5ddc7',
    borderLeftWidth: 1,
    backgroundColor: '#fffaf0',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
  },
  menuHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  menuTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 18,
  },
  closeIconText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  menuScroll: {
    flex: 1,
    marginTop: 4,
  },
  menuScrollContent: {
    paddingBottom: 24,
  },
  menuList: {
    gap: 0,
    marginTop: 16,
    borderTopColor: '#e5ddc7',
    borderTopWidth: 1,
  },
  menuItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottomColor: '#e5ddc7',
    borderBottomWidth: 1,
  },
  menuLabel: {
    flex: 1,
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
  },
  menuValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'right',
  },
  collapsibleSection: {
    marginTop: 14,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  collapsibleTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  collapsibleIcon: {
    color: '#6b7280',
    fontSize: 12,
  },
  collapsibleContent: {
    marginTop: 4,
  },
  resetButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff1f2',
    marginTop: 12,
  },
  resetText: {
    color: '#be123c',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footerContainer: {
    marginTop: 24,
    alignItems: 'center',
    position: 'relative',
  },
  footerVersion: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerLink: {
    color: '#4b5563',
    textDecorationLine: 'underline',
  },
  infoIconContainer: {
    padding: 2,
    marginTop: -4,
  },
  infoIcon: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  tooltipLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tooltipValue: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  tooltipVersion: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
  },
});
