import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { getProgressForCard, type ProgressByCard } from '../../lib/learning';
import type { CustomPreset } from '../../data/banglaLetters';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBanglaNum(value: number): string {
  return String(value).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}
function cardCountLabel(count: number): string {
  return `${toBanglaNum(count)}টি কার্ড`;
}

function masteryBarColor(percent: number): string {
  if (percent === 0) return '#9ca3af';
  if (percent < 40) return '#ef4444';
  if (percent < 70) return '#f97316';
  if (percent < 90) return '#f59e0b';
  if (percent < 100) return '#14b8a6';
  return '#10b981';
}

type RowState = 'locked' | 'started' | 'current' | 'mastered';

function StatusDot({ state }: { state: RowState }) {
  if (state === 'mastered') return <Text style={customStyles.dotMastered}>✓</Text>;
  if (state === 'current') return <Text style={customStyles.dotCurrent}>▶</Text>;
  if (state === 'started') return <Text style={customStyles.dotStarted}>◑</Text>;
  return <Text style={customStyles.dotLocked}>○</Text>;
}

export type CustomPathProps = {
  presets: CustomPreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onSelect: (presetId: string) => void;
  onCreate: () => void;
  onDelete: (presetId: string) => void;
  onEdit: (preset: CustomPreset) => void;
};

function confirmDelete(label: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`"${label}" মুছে ফেলবেন?`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert('পথ মুছুন', `"${label}" মুছে ফেলবেন?`, [
    { text: 'বাতিল', style: 'cancel' },
    { text: 'মুছুন', style: 'destructive', onPress: onConfirm },
  ]);
}

export function CustomPath({
  presets,
  progress,
  currentPresetId,
  onSelect,
  onCreate,
  onDelete,
  onEdit,
}: CustomPathProps) {
  return (
    <View style={customStyles.column}>
      {presets.length === 0 ? (
        <View style={customStyles.emptyState}>
          <Text style={customStyles.emptyIcon}>⚡</Text>
          <Text style={customStyles.emptyTitle}>কোনো দ্রুত পথ নেই</Text>
          <Text style={customStyles.emptyHint}>নিচের বোতাম চেপে নতুন পথ তৈরি করুন</Text>
        </View>
      ) : (
        presets.map((preset) => {
          const masteredCount = preset.cards.filter(
            (card) => getProgressForCard(progress, card.id).mastered,
          ).length;
          const totalCount = preset.cards.length;
          const percent =
            totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
          const isMastered = masteredCount === totalCount && totalCount > 0;
          const isCurrent = preset.id === currentPresetId;
          const hasStarted = !isMastered && masteredCount > 0;
          const barColor = masteryBarColor(percent);

          const state: RowState = isMastered
            ? 'mastered'
            : isCurrent
              ? 'current'
              : hasStarted
                ? 'started'
                : 'locked';

          const glyphText = preset.cards[0]?.letter ?? '·';

          return (
            <Pressable
              key={preset.id}
              accessibilityLabel={`${preset.label} প্রিসেট`}
              delayLongPress={420}
              onLongPress={() => confirmDelete(preset.label, () => onDelete(preset.id))}
              onPress={() => onEdit(preset)}
              style={({ pressed }) => [
                customStyles.row,
                isCurrent && customStyles.rowCurrent,
                pressed && customStyles.rowPressed,
              ]}
            >
              {/* Letter glyph in colored circle */}
              <View
                style={[
                  customStyles.glyphCell,
                  state === 'mastered' && customStyles.glyphCellMastered,
                  state === 'current' && customStyles.glyphCellCurrent,
                  state === 'locked' && customStyles.glyphCellLocked,
                ]}
              >
                <Text
                  style={[
                    customStyles.glyph,
                    state === 'mastered' && customStyles.glyphMastered,
                    state === 'current' && customStyles.glyphCurrent,
                    state === 'locked' && customStyles.glyphLocked,
                  ]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {glyphText}
                </Text>
              </View>

              {/* Middle: name + count + bar */}
              <View style={customStyles.midCell}>
                <View style={customStyles.titleRow}>
                  <Text
                    style={[
                      customStyles.label,
                      state === 'locked' && customStyles.labelLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {preset.label}
                  </Text>
                  <View style={customStyles.titleMeta}>
                    <StatusDot state={state} />
                    <Text
                      style={[
                        customStyles.percent,
                        state === 'mastered' && customStyles.percentMastered,
                      ]}
                    >
                      {toBanglaNum(percent)}%
                    </Text>
                  </View>
                </View>
                <Text style={customStyles.cardCount}>{cardCountLabel(preset.cards.length)}</Text>
                <View style={customStyles.barTrack}>
                  <View
                    style={[
                      customStyles.barFill,
                      { width: `${percent}%` as unknown as number, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </View>

              {/* Play button */}
              <Pressable
                accessibilityLabel={`${preset.label} শুরু করুন`}
                onPress={() => onSelect(preset.id)}
                style={({ pressed }) => [
                  customStyles.playBtn,
                  (state === 'current' || state === 'started') && customStyles.playBtnActive,
                  state === 'mastered' && customStyles.playBtnMastered,
                  state === 'locked' && customStyles.playBtnLocked,
                  pressed && customStyles.playBtnPressed,
                ]}
              >
                <Text
                  style={[
                    customStyles.playIcon,
                    (state === 'current' || state === 'started') && customStyles.playIconActive,
                    state === 'mastered' && customStyles.playIconMastered,
                    state === 'locked' && customStyles.playIconLocked,
                  ]}
                >
                  ▶
                </Text>
              </Pressable>
            </Pressable>
          );
        })
      )}

      <Pressable
        accessibilityLabel="নতুন পথ তৈরি করুন"
        onPress={onCreate}
        style={({ pressed }) => [customStyles.createBtn, pressed && customStyles.createBtnPressed]}
      >
        <Text style={customStyles.createBtnText}>+ নতুন পথ তৈরি করুন</Text>
      </Pressable>
    </View>
  );
}

const customStyles = StyleSheet.create({
  column: {
    gap: 8,
    paddingHorizontal: 4,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  emptyHint: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#faf6ee',
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#c4b99a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 1,
  },
  rowCurrent: {
    borderColor: '#f4512a',
    backgroundColor: '#fff9f6',
  },
  rowPressed: { opacity: 0.7 },

  glyphCell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ede8dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphCellCurrent: { backgroundColor: '#fde8e0' },
  glyphCellMastered: { backgroundColor: '#d1fae5' },
  glyphCellLocked: { backgroundColor: '#f3f4f6' },

  glyph: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 32,
  },
  glyphMastered: { color: '#047857' },
  glyphCurrent: { color: '#f4512a' },
  glyphLocked: { color: '#9ca3af' },

  midCell: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  labelLocked: { color: '#9ca3af' },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    flexShrink: 0,
  },
  percentMastered: { color: '#047857' },
  cardCount: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },

  dotMastered: { fontSize: 11, color: '#047857', fontWeight: '900', flexShrink: 0 },
  dotCurrent: { fontSize: 10, color: '#f4512a', fontWeight: '900', flexShrink: 0 },
  dotStarted: { fontSize: 11, color: '#f59e0b', flexShrink: 0 },
  dotLocked: { fontSize: 11, color: '#9ca3af', flexShrink: 0 },

  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#e5ddc7',
    overflow: 'hidden',
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },

  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1c9b4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  playBtnMastered: { borderColor: '#047857' },
  playBtnLocked: { borderColor: '#e5e7eb' },
  playBtnPressed: {
    opacity: 0.55,
    backgroundColor: '#f0ebe0',
  },
  playIcon: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '900',
  },
  playIconActive: { color: '#ffffff' },
  playIconMastered: { color: '#047857' },
  playIconLocked: { color: '#d1c9b4' },

  createBtn: {
    marginTop: 4,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#d1c9b4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnPressed: { opacity: 0.6, backgroundColor: '#f0ebe0' },
  createBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
});
