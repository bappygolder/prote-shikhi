import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MASTERY_TARGET, VOWEL_CARDS } from './data/banglaLetters';
import {
  applyGrade,
  chooseNextCard,
  getProgressForCard,
  getUnlockedCards,
  type ProgressByCard,
} from './lib/learning';

const STORAGE_KEY = 'bornomala.progress.v1';
const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

type SessionStats = {
  attempts: number;
  correct: number;
  wrong: number;
};

const initialSessionStats: SessionStats = {
  attempts: 0,
  correct: 0,
  wrong: 0,
};

type ProgressBarProps = {
  label: string;
  completed: number;
  total: number;
  percent: number;
};

function toBanglaNumber(value: number | string) {
  return String(value).replace(/\d/g, (digit) => BANGLA_DIGITS[Number(digit)]);
}

function ProgressBar({ label, completed, total, percent }: ProgressBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const fillWidth = `${clampedPercent}%` as `${number}%`;

  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressTextRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>
          {toBanglaNumber(completed)}/{toBanglaNumber(total)} ·{' '}
          {toBanglaNumber(clampedPercent)}%
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: fillWidth }]} />
      </View>
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

  const unlockedCards = useMemo(
    () => getUnlockedCards(VOWEL_CARDS, progress),
    [progress],
  );

  const currentCard =
    unlockedCards.find((card) => card.id === currentCardId) ?? unlockedCards[0];
  const currentProgress = getProgressForCard(progress, currentCard.id);
  const masteredCount = VOWEL_CARDS.filter(
    (card) => getProgressForCard(progress, card.id).mastered,
  ).length;
  const totalMasteryPercent = Math.round(
    (masteredCount / VOWEL_CARDS.length) * 100,
  );
  const currentMasteryPercent = Math.min(
    100,
    Math.round((currentProgress.correctCount / MASTERY_TARGET) * 100),
  );
  const sessionAccuracy =
    sessionStats.attempts === 0
      ? 0
      : Math.round((sessionStats.correct / sessionStats.attempts) * 100);

  function handleGrade(wasCorrect: boolean) {
    const nextProgress = applyGrade(progress, currentCard.id, wasCorrect);
    const nextUnlockedCards = getUnlockedCards(VOWEL_CARDS, nextProgress);
    const nextCard = chooseNextCard(
      nextUnlockedCards,
      nextProgress,
      currentCard.id,
    );

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
    setIsMenuOpen(false);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      // Reset still updates the current screen even if storage cleanup fails.
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.shell}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="মেনু খুলুন"
            onPress={() => setIsMenuOpen(true)}
            style={({ pressed }) => [
              styles.menuButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>

          <View style={styles.titleBlock}>
            <Text style={styles.brand}>পড়তে শিখি</Text>
            <Text style={styles.stage}>স্বরবর্ণ</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

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

        <View style={styles.card}>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            style={styles.letter}
          >
            {currentCard.letter}
          </Text>
        </View>

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

      {isMenuOpen ? (
        <View style={styles.menuLayer}>
          <Pressable
            accessibilityLabel="মেনু বন্ধ করুন"
            onPress={() => setIsMenuOpen(false)}
            style={styles.menuBackdrop}
          />
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>মেনু</Text>
              <Pressable
                accessibilityLabel="মেনু বন্ধ করুন"
                onPress={() => setIsMenuOpen(false)}
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
          </View>
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
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    minHeight: 44,
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  headerSpacer: {
    width: 44,
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
    fontWeight: '600',
    letterSpacing: 0,
  },
  progressStack: {
    gap: 12,
  },
  progressBlock: {
    gap: 8,
  },
  progressTextRow: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  progressValue: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  progressTrack: {
    height: 13,
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
  card: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
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
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.36)',
  },
  menuPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '78%',
    maxWidth: 340,
    borderRightColor: '#e5ddc7',
    borderRightWidth: 1,
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
