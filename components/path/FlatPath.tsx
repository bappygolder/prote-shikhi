import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getProgressForCard, type ProgressByCard } from '../../lib/learning';
import type { PracticePreset } from '../../data/banglaLetters';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBanglaNum(value: number): string {
  return String(value).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
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
  if (state === 'mastered') return <Text style={flatStyles.dotMastered}>✓</Text>;
  if (state === 'current') return <Text style={flatStyles.dotCurrent}>▶</Text>;
  if (state === 'started') return <Text style={flatStyles.dotStarted}>◑</Text>;
  return <Text style={flatStyles.dotLocked}>○</Text>;
}

export type FlatPathProps = {
  presets: PracticePreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onDetail: (preset: PracticePreset) => void;
  onSelect: (presetId: string) => void;
  onLongPressReset: (preset: PracticePreset) => void;
};

export function FlatPath({
  presets,
  progress,
  currentPresetId,
  onDetail,
  onSelect,
  onLongPressReset,
}: FlatPathProps) {
  return (
    <View style={flatStyles.column}>
      {presets.map((preset) => {
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

        return (
          <Pressable
            key={preset.id}
            accessibilityLabel={`${preset.label} প্রিসেট`}
            delayLongPress={420}
            onLongPress={() => onLongPressReset(preset)}
            onPress={() => onDetail(preset)}
            style={({ pressed }) => [
              flatStyles.row,
              isCurrent && flatStyles.rowCurrent,
              pressed && flatStyles.rowPressed,
            ]}
          >
            <View style={flatStyles.glyphCell}>
              <Text
                style={[
                  flatStyles.glyph,
                  state === 'mastered' && flatStyles.glyphMastered,
                  state === 'current' && flatStyles.glyphCurrent,
                  state === 'locked' && flatStyles.glyphLocked,
                ]}
              >
                {preset.cards[0]?.letter ?? '·'}
              </Text>
            </View>

            <View style={flatStyles.midCell}>
              <View style={flatStyles.titleRow}>
                <Text
                  style={[
                    flatStyles.label,
                    state === 'locked' && flatStyles.labelLocked,
                  ]}
                  numberOfLines={1}
                >
                  {preset.label}
                </Text>
                <Text style={flatStyles.sep}> · </Text>
                <StatusDot state={state} />
                <Text style={flatStyles.sep}> · </Text>
                <Text
                  style={[
                    flatStyles.percent,
                    state === 'locked' && flatStyles.percentLocked,
                    state === 'mastered' && flatStyles.percentMastered,
                  ]}
                >
                  {toBanglaNum(percent)}%
                </Text>
              </View>
              <View style={flatStyles.barTrack}>
                <View
                  style={[
                    flatStyles.barFill,
                    { width: `${percent}%` as unknown as number, backgroundColor: barColor },
                  ]}
                />
              </View>
            </View>

            <Pressable
              accessibilityLabel={`${preset.label} শুরু করুন`}
              onPress={() => onSelect(preset.id)}
              style={({ pressed }) => [
                flatStyles.playBtn,
                state === 'mastered' && flatStyles.playBtnMastered,
                state === 'current' && flatStyles.playBtnCurrent,
                state === 'locked' && flatStyles.playBtnLocked,
                pressed && flatStyles.playBtnPressed,
              ]}
            >
              <Text
                style={[
                  flatStyles.playIcon,
                  state === 'mastered' && flatStyles.playIconMastered,
                  state === 'current' && flatStyles.playIconCurrent,
                  state === 'locked' && flatStyles.playIconLocked,
                ]}
              >
                ▶
              </Text>
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const flatStyles = StyleSheet.create({
  column: {
    gap: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowCurrent: {
    borderColor: '#111827',
  },
  rowPressed: {
    opacity: 0.7,
  },

  // Glyph
  glyphCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  glyphMastered: { color: '#047857' },
  glyphCurrent: { color: '#f4512a' },
  glyphLocked: { color: '#9ca3af' },

  // Middle: title row + bar
  midCell: {
    flex: 1,
    gap: 6,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  labelLocked: { color: '#9ca3af' },
  sep: {
    fontSize: 11,
    color: '#9ca3af',
    flexShrink: 0,
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    flexShrink: 0,
  },
  percentLocked: { color: '#9ca3af' },
  percentMastered: { color: '#047857' },

  // Status dots inline in title
  dotMastered: { fontSize: 11, color: '#047857', fontWeight: '900', flexShrink: 0 },
  dotCurrent: { fontSize: 10, color: '#f4512a', fontWeight: '900', flexShrink: 0 },
  dotStarted: { fontSize: 11, color: '#f59e0b', flexShrink: 0 },
  dotLocked: { fontSize: 11, color: '#9ca3af', flexShrink: 0 },

  // Bar
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

  // Play button — prominent square with border
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playBtnMastered: { borderColor: '#047857' },
  playBtnCurrent: { borderColor: '#f4512a' },
  playBtnLocked: { borderColor: '#d1c9b4' },
  playBtnPressed: {
    opacity: 0.55,
    backgroundColor: '#f0ebe0',
  },
  playIcon: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '900',
  },
  playIconMastered: { color: '#047857' },
  playIconCurrent: { color: '#f4512a' },
  playIconLocked: { color: '#d1c9b4' },
});
