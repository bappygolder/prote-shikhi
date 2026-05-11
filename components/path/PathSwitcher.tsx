import { Pressable, StyleSheet, Text, View } from 'react-native';

export type PathView = 'zigzag' | 'flat';

export type PathSwitcherProps = {
  value: PathView;
  onChange: (view: PathView) => void;
};

const TABS: { id: PathView; label: string }[] = [
  { id: 'zigzag', label: '〰 ঘুরে পথ' },
  { id: 'flat', label: '≡ সহজ পথ' },
];

export function PathSwitcher({ value, onChange }: PathSwitcherProps) {
  return (
    <View style={switcherStyles.container}>
      {TABS.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.id)}
            style={({ pressed }) => [
              switcherStyles.pill,
              active ? switcherStyles.pillActive : switcherStyles.pillInactive,
              pressed && switcherStyles.pillPressed,
            ]}
          >
            <Text
              style={[
                switcherStyles.label,
                active ? switcherStyles.labelActive : switcherStyles.labelInactive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const switcherStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  pillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderColor: '#e5ddc7',
  },
  pillPressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelActive: {
    color: '#f0ece0',
  },
  labelInactive: {
    color: '#6b7280',
  },
});
