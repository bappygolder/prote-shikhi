import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../lib/theme';
import { getProgressForCard, type ProgressByCard } from '../../lib/learning';
import type { PracticePreset } from '../../data/banglaLetters';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBanglaNum(value: number): string {
  return String(value).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

type PresetNodeState = 'locked' | 'started' | 'mastered' | 'current';

export type PresetPathProps = {
  presets: PracticePreset[];
  progress: ProgressByCard;
  currentPresetId: string | null;
  onSelect: (presetId: string) => void;
  onLongPressReset: (preset: PracticePreset) => void;
};

export function PresetPath({
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
                {toBanglaNum(masteredCount)}/{toBanglaNum(totalCount)}
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
