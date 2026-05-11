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

function StatusIcon({
  mastered,
  started,
  isCurrent,
}: {
  mastered: boolean;
  started: boolean;
  isCurrent: boolean;
}) {
  if (mastered) return <Text style={flatStyles.iconMastered}>✓</Text>;
  if (isCurrent) return <Text style={flatStyles.iconCurrent}>▶</Text>;
  if (started) return <Text style={flatStyles.iconStarted}>◑</Text>;
  return <Text style={flatStyles.iconLocked}>○</Text>;
}

export type FlatPathProps = {
  presets: PracticePreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onDetail: (preset: PracticePreset) => void;
  onLongPressReset: (preset: PracticePreset) => void;
};

export function FlatPath({
  presets,
  progress,
  currentPresetId,
  onDetail,
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
                  isMastered && flatStyles.glyphMastered,
                  isCurrent && flatStyles.glyphCurrent,
                  !isCurrent && !isMastered && !hasStarted && flatStyles.glyphLocked,
                ]}
              >
                {preset.cards[0]?.letter ?? '·'}
              </Text>
            </View>

            <View style={flatStyles.midCell}>
              <Text
                style={[
                  flatStyles.label,
                  !isCurrent && !isMastered && !hasStarted && flatStyles.labelLocked,
                ]}
                numberOfLines={1}
              >
                {preset.label}
              </Text>
              <View style={flatStyles.barTrack}>
                <View
                  style={[
                    flatStyles.barFill,
                    { width: `${percent}%` as unknown as number, backgroundColor: barColor },
                  ]}
                />
              </View>
              <Text style={flatStyles.count}>
                {toBanglaNum(masteredCount)}/{toBanglaNum(totalCount)} · {toBanglaNum(percent)}%
              </Text>
            </View>

            <View style={flatStyles.iconCell}>
              <StatusIcon
                mastered={isMastered}
                started={hasStarted}
                isCurrent={isCurrent}
              />
            </View>
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
    height: 64,
    borderRadius: 12,
    paddingHorizontal: 10,
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
  glyphMastered: {
    color: '#047857',
  },
  glyphCurrent: {
    color: '#f4512a',
  },
  glyphLocked: {
    color: '#9ca3af',
  },
  midCell: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  labelLocked: {
    color: '#9ca3af',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5ddc7',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  iconCell: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMastered: { fontSize: 18, color: '#047857', fontWeight: '900' },
  iconCurrent: { fontSize: 14, color: '#f4512a', fontWeight: '900' },
  iconStarted: { fontSize: 18, color: '#f59e0b' },
  iconLocked: { fontSize: 18, color: '#9ca3af' },
});
