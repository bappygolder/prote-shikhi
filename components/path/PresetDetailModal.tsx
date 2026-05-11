import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getProgressForCard, type ProgressByCard } from '../../lib/learning';
import type { LetterCard, PracticePreset } from '../../data/banglaLetters';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBn(n: number): string {
  return String(n).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

function barColor(pct: number): string {
  if (pct === 0) return '#9ca3af';
  if (pct < 40) return '#ef4444';
  if (pct < 70) return '#f97316';
  if (pct < 90) return '#f59e0b';
  if (pct < 100) return '#14b8a6';
  return '#10b981';
}

function CardRow({ card, progress }: { card: LetterCard; progress: ProgressByCard }) {
  const p = getProgressForCard(progress, card.id);
  const hasStarted = p.seenCount > 0;
  const { mastered, correctCount, wrongCount, level, levelCorrect } = p;

  return (
    <View style={s.cardRow}>
      <Text
        style={[
          s.cardGlyph,
          mastered && s.cardGlyphMastered,
          !mastered && hasStarted && s.cardGlyphStarted,
          !hasStarted && s.cardGlyphLocked,
        ]}
      >
        {card.letter}
      </Text>

      <View style={s.cardMid}>
        {hasStarted ? (
          <View style={s.cardStatRow}>
            <Text style={s.statCorrect}>✓ {toBn(correctCount)}</Text>
            <Text style={s.statSep}>·</Text>
            <Text style={s.statWrong}>✗ {toBn(wrongCount)}</Text>
          </View>
        ) : (
          <Text style={s.cardNotStarted}>এখনো শুরু হয়নি</Text>
        )}
        {hasStarted ? (
          <Text style={s.cardSubtext}>মোট চেষ্টা {toBn(p.seenCount)}</Text>
        ) : null}
      </View>

      <View style={s.cardStatusCell}>
        {mastered ? (
          <Text style={s.iconMastered}>✓</Text>
        ) : hasStarted ? (
          <View style={s.streakBadge}>
            <Text style={s.streakBadgeText}>স্তর {toBn(level)}</Text>
            <Text style={s.streakBadgeSubtext}>{toBn(levelCorrect)} সঠিক</Text>
          </View>
        ) : (
          <Text style={s.iconLocked}>○</Text>
        )}
      </View>
    </View>
  );
}

export type PresetDetailModalProps = {
  preset: PracticePreset | null;
  allPresets: PracticePreset[];
  progress: ProgressByCard;
  resetCount: number;
  onClose: () => void;
  onPractice: (presetId: string) => void;
  onReset: (preset: PracticePreset) => void;
  onNavigate: (preset: PracticePreset) => void;
};

export function PresetDetailModal({
  preset,
  allPresets,
  progress,
  resetCount,
  onClose,
  onPractice,
  onReset,
  onNavigate,
}: PresetDetailModalProps) {
  const isWeb = Platform.OS === 'web';

  const index = preset ? allPresets.findIndex((p) => p.id === preset.id) : -1;
  const prevPreset = preset && index > 0 ? allPresets[index - 1] : null;
  const nextPreset =
    preset && index >= 0 && index < allPresets.length - 1 ? allPresets[index + 1] : null;

  const masteredCount = preset
    ? preset.cards.filter((c) => getProgressForCard(progress, c.id).mastered).length
    : 0;
  const totalCount = preset ? preset.cards.length : 0;
  const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
  const totalAttempts = preset
    ? preset.cards.reduce((sum, c) => sum + getProgressForCard(progress, c.id).seenCount, 0)
    : 0;
  const totalWrong = preset
    ? preset.cards.reduce((sum, c) => sum + getProgressForCard(progress, c.id).wrongCount, 0)
    : 0;
  const color = barColor(percent);

  const panelContent = preset ? (
    <>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
          <Text style={s.closeBtnText}>✕</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerGlyph}>{preset.cards[0]?.letter ?? '·'}</Text>
          <View>
            <Text style={s.headerLabel}>{preset.label}</Text>
            <Text style={s.headerStep}>
              ধাপ {toBn(index + 1)}/{toBn(allPresets.length)}
            </Text>
          </View>
        </View>
        <View style={s.closeBtn} />
      </View>

      {/* ── Nav row ── */}
      <View style={s.navRow}>
        <Pressable
          style={({ pressed }) => [
            s.navBtn,
            !prevPreset && s.navBtnDisabled,
            pressed && s.navBtnPressed,
          ]}
          onPress={() => prevPreset && onNavigate(prevPreset)}
          disabled={!prevPreset}
        >
          <Text style={[s.navBtnText, !prevPreset && s.navBtnTextDisabled]}>
            ← {prevPreset ? prevPreset.label : 'শুরু'}
          </Text>
        </Pressable>
        <View style={s.navDot} />
        <Pressable
          style={({ pressed }) => [
            s.navBtn,
            s.navBtnRight,
            !nextPreset && s.navBtnDisabled,
            pressed && s.navBtnPressed,
          ]}
          onPress={() => nextPreset && onNavigate(nextPreset)}
          disabled={!nextPreset}
        >
          <Text style={[s.navBtnText, s.navBtnTextRight, !nextPreset && s.navBtnTextDisabled]}>
            {nextPreset ? nextPreset.label : 'শেষ'} →
          </Text>
        </Pressable>
      </View>

      {/* ── Stats bar ── */}
      <View style={s.statsBlock}>
        <View style={s.statsBigRow}>
          <View style={s.statBig}>
            <Text style={s.statBigValue}>
              {toBn(masteredCount)}/{toBn(totalCount)}
            </Text>
            <Text style={s.statBigLabel}>আয়ত্ত</Text>
          </View>
          <View style={s.statsDivider} />
          <View style={s.statBig}>
            <Text style={[s.statBigValue, { color }]}>{toBn(percent)}%</Text>
            <Text style={s.statBigLabel}>অগ্রগতি</Text>
          </View>
          <View style={s.statsDivider} />
          <View style={s.statBig}>
            <Text style={s.statBigValue}>{toBn(totalAttempts)}</Text>
            <Text style={s.statBigLabel}>চেষ্টা</Text>
          </View>
          <View style={s.statsDivider} />
          <View style={s.statBig}>
            <Text style={[s.statBigValue, totalWrong > 0 && s.statBigWrong]}>
              {toBn(totalWrong)}
            </Text>
            <Text style={s.statBigLabel}>ভুল</Text>
          </View>
          <View style={s.statsDivider} />
          <View style={s.statBig}>
            <Text style={s.statBigValue}>{toBn(resetCount)}</Text>
            <Text style={s.statBigLabel}>রিসেট</Text>
          </View>
        </View>
        <View style={s.barTrack}>
          <View
            style={[
              s.barFill,
              { width: `${percent}%` as unknown as number, backgroundColor: color },
            ]}
          />
        </View>
      </View>

      <View style={s.divider} />

      {/* ── Per-card list ── */}
      <ScrollView
        style={[s.scroll, isWeb && s.scrollWeb]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionHeader}>এই পথের অক্ষরগুলো</Text>
        {preset.cards.map((card) => (
          <CardRow key={card.id} card={card} progress={progress} />
        ))}
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View style={s.bottomBar}>
        <Pressable
          style={({ pressed }) => [s.resetBtn, pressed && s.btnPressed]}
          onPress={() => onReset(preset)}
        >
          <Text style={s.resetBtnText}>রিসেট</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.practiceBtn, pressed && s.btnPressed]}
          onPress={() => onPractice(preset.id)}
        >
          <Text style={s.practiceBtnText}>অনুশীলন করুন ▶</Text>
        </Pressable>
      </View>
    </>
  ) : null;

  if (isWeb) {
    return (
      <Modal
        visible={preset !== null}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <Pressable style={s.webBackdrop} onPress={onClose}>
          <Pressable style={s.webPanel} onPress={() => {}}>
            {panelContent}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal
      visible={preset !== null}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.screen}>{panelContent}</SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  // Native full-screen container
  screen: {
    flex: 1,
    backgroundColor: '#faf7f0',
  },

  // Web: backdrop + centered panel
  webBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  webPanel: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#faf7f0',
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  headerGlyph: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827',
  },
  headerLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerStep: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  closeBtn: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: '#6b7280',
  },

  // Nav row
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f0ebe0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  navBtnRight: {
    alignItems: 'flex-end',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnPressed: {
    backgroundColor: '#e5ddc7',
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  navBtnTextRight: {
    textAlign: 'right',
  },
  navBtnTextDisabled: {
    color: '#9ca3af',
  },
  navDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1c9b4',
  },

  // Stats block
  statsBlock: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#f0ebe0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  statsBigRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBig: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statBigValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  statBigWrong: {
    color: '#ef4444',
  },
  statBigLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#d1c9b4',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1c9b4',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },

  divider: {
    height: 1,
    backgroundColor: '#e5ddc7',
    marginHorizontal: 16,
    marginBottom: 4,
  },

  // Card list
  scroll: {
    flex: 1,
  },
  scrollWeb: {
    flex: 0,
    maxHeight: 360,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f5f1e8',
    gap: 12,
    marginBottom: 4,
  },
  cardGlyph: {
    fontSize: 32,
    fontWeight: '900',
    width: 42,
    textAlign: 'center',
    color: '#111827',
  },
  cardGlyphMastered: { color: '#047857' },
  cardGlyphStarted: { color: '#f4512a' },
  cardGlyphLocked: { color: '#9ca3af' },
  cardMid: {
    flex: 1,
    gap: 3,
  },
  cardStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statCorrect: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  statWrong: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  statStreak: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
  },
  statSep: {
    fontSize: 12,
    color: '#9ca3af',
  },
  cardSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  cardNotStarted: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  cardStatusCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMastered: {
    fontSize: 18,
    color: '#047857',
    fontWeight: '900',
  },
  iconLocked: {
    fontSize: 16,
    color: '#9ca3af',
  },
  streakBadge: {
    backgroundColor: '#e5ddc7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'center',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  streakBadgeSubtext: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6b7280',
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5ddc7',
    backgroundColor: '#faf7f0',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  practiceBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  practiceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#faf7f0',
  },
  btnPressed: {
    opacity: 0.7,
  },
});
