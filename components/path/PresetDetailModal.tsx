import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getProgressForCard, type ProgressByCard } from '../../lib/learning';
import type { PracticePreset } from '../../data/banglaLetters';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBanglaNum(n: number): string {
  return String(n).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

function masteryBarColor(percent: number): string {
  if (percent === 0) return '#9ca3af';
  if (percent < 40) return '#ef4444';
  if (percent < 70) return '#f97316';
  if (percent < 90) return '#f59e0b';
  if (percent < 100) return '#14b8a6';
  return '#10b981';
}

export type PresetDetailModalProps = {
  preset: PracticePreset | null;
  allPresets: PracticePreset[];
  progress: ProgressByCard;
  resetCount: number;
  onClose: () => void;
  onPractice: (presetId: string) => void;
  onReset: (preset: PracticePreset) => void;
};

export function PresetDetailModal({
  preset,
  allPresets,
  progress,
  resetCount,
  onClose,
  onPractice,
  onReset,
}: PresetDetailModalProps) {
  const index = preset ? allPresets.findIndex((p) => p.id === preset.id) : -1;
  const prevPreset = preset && index > 0 ? allPresets[index - 1] : null;
  const nextPreset = preset && index < allPresets.length - 1 ? allPresets[index + 1] : null;

  const masteredCount = preset
    ? preset.cards.filter((card) => getProgressForCard(progress, card.id).mastered).length
    : 0;
  const totalCount = preset ? preset.cards.length : 0;
  const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
  const totalAttempts = preset
    ? preset.cards.reduce(
        (sum, card) => sum + (getProgressForCard(progress, card.id).seenCount ?? 0),
        0,
      )
    : 0;
  const barColor = masteryBarColor(percent);

  return (
    <Modal
      visible={preset !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      {preset ? (
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.glyph}>{preset.cards[0]?.letter ?? '·'}</Text>
            <View style={s.headerText}>
              <Text style={s.label}>{preset.label}</Text>
              <Text style={s.step}>
                ধাপ {toBanglaNum(index + 1)}/{toBanglaNum(allPresets.length)}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Path context — where this sits in the journey */}
          <View style={s.pathContext}>
            <Text style={s.pathContextItem} numberOfLines={1}>
              {prevPreset ? `← ${prevPreset.label}` : '← শুরু'}
            </Text>
            <View style={s.pathContextDot} />
            <Text style={[s.pathContextItem, s.pathContextRight]} numberOfLines={1}>
              {nextPreset ? `${nextPreset.label} →` : 'শেষ →'}
            </Text>
          </View>

          <View style={s.divider} />

          {/* Progress bar */}
          <View style={s.progressSection}>
            <View style={s.barTrack}>
              <View
                style={[
                  s.barFill,
                  { width: `${percent}%` as unknown as number, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={s.progressLabel}>
              {toBanglaNum(masteredCount)}/{toBanglaNum(totalCount)} আয়ত্ত · {toBanglaNum(percent)}%
            </Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statValue}>{toBanglaNum(totalAttempts)}</Text>
              <Text style={s.statLabel}>মোট চেষ্টা</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={s.statValue}>{toBanglaNum(resetCount)}</Text>
              <Text style={s.statLabel}>রিসেট হয়েছে</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Action buttons */}
          <View style={s.actions}>
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
        </View>
      ) : null}
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#faf7f0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  glyph: {
    fontSize: 44,
    fontWeight: '900',
    color: '#111827',
    width: 54,
    textAlign: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  step: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#6b7280',
  },
  pathContext: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ebe0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  pathContextItem: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  pathContextRight: {
    textAlign: 'right',
  },
  pathContextDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1c9b4',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5ddc7',
  },
  progressSection: {
    gap: 6,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5ddc7',
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0ebe0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#d1c9b4',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
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
