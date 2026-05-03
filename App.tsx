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

export default function App() {
  const [progress, setProgress] = useState<ProgressByCard>({});
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    initialSessionStats,
  );
  const [currentCardId, setCurrentCardId] = useState(VOWEL_CARDS[0].id);
  const [isLoaded, setIsLoaded] = useState(false);

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
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
      // Reset still updates the current screen even if storage cleanup fails.
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.shell}>
        <View style={styles.header}>
          <Text style={styles.brand}>Bornomala</Text>
          <Text style={styles.stage}>স্বরবর্ণ</Text>
        </View>

        <View style={styles.progressGrid}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>
              {currentProgress.correctCount}/{MASTERY_TARGET}
            </Text>
            <Text style={styles.statLabel}>এই অক্ষর</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>
              {masteredCount}/{VOWEL_CARDS.length}
            </Text>
            <Text style={styles.statLabel}>আয়ত্ত</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>
              {unlockedCards.length}/{VOWEL_CARDS.length}
            </Text>
            <Text style={styles.statLabel}>খোলা</Text>
          </View>
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

        <View style={styles.sessionRow}>
          <Text style={styles.sessionText}>সেশন {sessionStats.attempts}</Text>
          <Text style={styles.sessionText}>{sessionAccuracy}% ঠিক</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Mark wrong"
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
            accessibilityLabel="Mark right"
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

        <Pressable onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>রিসেট</Text>
        </Pressable>
      </View>
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
    gap: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  brand: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0,
  },
  stage: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statBlock: {
    flex: 1,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#e5ddc7',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#fffaf0',
  },
  statValue: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  statLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 4,
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
  sessionRow: {
    minHeight: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
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
  resetButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
});
