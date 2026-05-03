import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  MASTERY_TARGET,
  VOWEL_CARDS,
  type LetterCard,
} from './data/banglaLetters';
import {
  applyGrade,
  chooseNextCard,
  getProgressForCard,
  getUnlockedCards,
  type ProgressByCard,
} from './lib/learning';

const STORAGE_KEY = 'bornomala.progress.v1';
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

type AppTab = 'practice' | 'letters';
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

function getPracticeCardsForList(
  listId: PracticeListId,
  progress: ProgressByCard,
  unlockedCards: LetterCard[],
) {
  if (listId === 'all') {
    return VOWEL_CARDS;
  }

  if (listId === 'needsWork') {
    return VOWEL_CARDS.filter(
      (card) => !getProgressForCard(progress, card.id).mastered,
    );
  }

  if (listId === 'mastered') {
    return VOWEL_CARDS.filter(
      (card) => getProgressForCard(progress, card.id).mastered,
    );
  }

  return unlockedCards;
}

function getEffectivePracticeCards(
  listId: PracticeListId,
  progress: ProgressByCard,
  unlockedCards: LetterCard[],
) {
  const listCards = getPracticeCardsForList(listId, progress, unlockedCards);

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

export default function App() {
  const [progress, setProgress] = useState<ProgressByCard>({});
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    initialSessionStats,
  );
  const [currentCardId, setCurrentCardId] = useState(VOWEL_CARDS[0].id);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<AppTab>('practice');
  const [selectedPracticeList, setSelectedPracticeList] =
    useState<PracticeListId>('unlocked');
  const [gradeFeedback, setGradeFeedback] = useState<GradeFeedback>(null);
  const ambientMotion = useRef(new Animated.Value(0)).current;
  const cardEntrance = useRef(new Animated.Value(1)).current;
  const feedbackBurst = useRef(new Animated.Value(0)).current;
  const menuSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((savedProgress) => {
        if (!isMounted || !savedProgress) {
          return;
        }

        setProgress(JSON.parse(savedProgress) as ProgressByCard);
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

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress)).catch(() => {
      // Keep the trainer responsive even if storage fails.
    });
  }, [isLoaded, progress]);

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

  const unlockedCards = useMemo(
    () => getUnlockedCards(VOWEL_CARDS, progress),
    [progress],
  );
  const practiceCards = useMemo(
    () => getPracticeCardsForList(selectedPracticeList, progress, unlockedCards),
    [progress, selectedPracticeList, unlockedCards],
  );
  const effectivePracticeCards = useMemo(
    () => getEffectivePracticeCards(selectedPracticeList, progress, unlockedCards),
    [progress, selectedPracticeList, unlockedCards],
  );

  useEffect(() => {
    const cardIsAvailable = effectivePracticeCards.some(
      (card) => card.id === currentCardId,
    );

    if (!cardIsAvailable) {
      setCurrentCardId(effectivePracticeCards[0]?.id ?? VOWEL_CARDS[0].id);
    }
  }, [currentCardId, effectivePracticeCards]);

  const currentCard =
    effectivePracticeCards.find((card) => card.id === currentCardId) ??
    effectivePracticeCards[0] ??
    VOWEL_CARDS[0];
  const currentProgress = getProgressForCard(progress, currentCard.id);
  const masteredCount = VOWEL_CARDS.filter(
    (card) => getProgressForCard(progress, card.id).mastered,
  ).length;
  const totalMasteryPercent = Math.round(
    (masteredCount / VOWEL_CARDS.length) * 100,
  );
  const currentMasteryPercent = getMasteryPercent(progress, currentCard.id);
  const sessionAccuracy =
    sessionStats.attempts === 0
      ? 0
      : Math.round((sessionStats.correct / sessionStats.attempts) * 100);
  const selectedListLabel =
    PRACTICE_LISTS.find((list) => list.id === selectedPracticeList)?.label ??
    PRACTICE_LISTS[0].label;
  const practiceListCounts: Record<PracticeListId, number> = {
    unlocked: unlockedCards.length,
    all: VOWEL_CARDS.length,
    needsWork: VOWEL_CARDS.filter(
      (card) => !getProgressForCard(progress, card.id).mastered,
    ).length,
    mastered: VOWEL_CARDS.filter(
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
    const nextUnlockedCards = getUnlockedCards(VOWEL_CARDS, nextProgress);
    const nextPracticeCards = getEffectivePracticeCards(
      selectedPracticeList,
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
    setProgress({});
    setSessionStats(initialSessionStats);
    setCurrentCardId(VOWEL_CARDS[0].id);
    setSelectedPracticeList('unlocked');
    setCurrentTab('practice');
    setIsMenuOpen(false);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      // Reset still updates the current screen even if storage cleanup fails.
    });
  }

  function handleSelectPracticeList(listId: PracticeListId) {
    const nextCards = getEffectivePracticeCards(listId, progress, unlockedCards);

    setSelectedPracticeList(listId);
    setCurrentCardId(nextCards[0]?.id ?? VOWEL_CARDS[0].id);
  }

  function handleChooseLetter(card: LetterCard) {
    const isInCurrentPracticeList = practiceCards.some(
      (practiceCard) => practiceCard.id === card.id,
    );

    if (!isInCurrentPracticeList) {
      setSelectedPracticeList('all');
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
            <Text style={styles.stage}>
              {currentTab === 'practice' ? selectedListLabel : 'অক্ষর'}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {currentTab === 'practice' ? (
          <View style={styles.practiceContent}>
            <View style={styles.progressStack}>
              <ProgressBar
                completed={masteredCount}
                label="মোট শেখা"
                percent={totalMasteryPercent}
                total={VOWEL_CARDS.length}
              />
              <ProgressBar
                completed={currentProgress.correctCount}
                label="এই অক্ষর"
                percent={currentMasteryPercent}
                total={MASTERY_TARGET}
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
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={styles.letter}
              >
                {currentCard.letter}
              </Text>
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
                  {toBanglaNumber(masteredCount)}/{toBanglaNumber(VOWEL_CARDS.length)} শেখা
                </Text>
              </View>
              <View style={styles.lettersCountBadge}>
                <Text style={styles.lettersCountText}>
                  {toBanglaNumber(VOWEL_CARDS.length)}
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
              {VOWEL_CARDS.map((card) => {
                const masteryPercent = getMasteryPercent(progress, card.id);
                const isCurrentCard = currentCard.id === card.id;
                const isMastered = masteryPercent >= 100;
                const hasProgress = masteryPercent > 0 && !isMastered;

                return (
                  <Pressable
                    accessibilityLabel={`${card.letter} প্র্যাকটিস করুন`}
                    key={card.id}
                    onPress={() => handleChooseLetter(card)}
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
                      {card.letter}
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
                  styles.closeButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.closeText}>বন্ধ</Text>
              </Pressable>
            </View>

            <View style={styles.menuList}>
              <View style={styles.menuItem}>
                <Text style={styles.menuLabel}>প্র্যাকটিস তালিকা</Text>
                <Text style={styles.menuValue}>{selectedListLabel}</Text>
              </View>
              <View style={styles.menuItem}>
                <Text style={styles.menuLabel}>খোলা অক্ষর</Text>
                <Text style={styles.menuValue}>
                  {toBanglaNumber(unlockedCards.length)}/
                  {toBanglaNumber(VOWEL_CARDS.length)}
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
    gap: 9,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 28,
  },
  progressLabel: {
    color: '#111827',
    width: 74,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  progressValue: {
    color: '#6b7280',
    flexShrink: 0,
    width: 48,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'right',
  },
  progressTrack: {
    position: 'relative',
    flex: 1,
    height: 12,
    overflow: 'hidden',
    borderColor: '#e5ddc7',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fffaf0',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#047857',
  },
  progressBreakpoint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#d8ceb3',
  },
  card: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
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
    fontSize: 176,
    fontWeight: '700',
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 214,
    textAlign: 'center',
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
    fontSize: 58,
    fontWeight: '800',
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: 70,
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 23,
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
    paddingTop: 58,
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
  closeButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  closeText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  menuList: {
    gap: 0,
    marginTop: 24,
    borderTopColor: '#e5ddc7',
    borderTopWidth: 1,
  },
  menuItem: {
    minHeight: 52,
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
  resetButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fff1f2',
    marginTop: 'auto',
  },
  resetText: {
    color: '#be123c',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
