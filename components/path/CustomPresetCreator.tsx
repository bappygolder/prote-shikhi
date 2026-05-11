import { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CONSONANT_CARDS,
  NUMBER_CARDS,
  VOWEL_CARDS,
  VOWEL_SIGN_CARDS,
  type CustomPreset,
  type LetterCard,
} from '../../data/banglaLetters';

export type CustomPresetCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (preset: CustomPreset) => void;
};

type WordChip = { id: string; word: string };

const LETTER_SECTIONS: { label: string; cards: LetterCard[] }[] = [
  { label: 'স্বর', cards: VOWEL_CARDS },
  { label: 'কার চিহ্ন', cards: VOWEL_SIGN_CARDS },
  { label: 'ব্যঞ্জন', cards: CONSONANT_CARDS },
  { label: 'সংখ্যা', cards: NUMBER_CARDS },
];

export function CustomPresetCreator({ visible, onClose, onSave }: CustomPresetCreatorProps) {
  const [name, setName] = useState('');
  const [selectedLetterIds, setSelectedLetterIds] = useState<Set<string>>(new Set());
  const [wordInput, setWordInput] = useState('');
  const [wordChips, setWordChips] = useState<WordChip[]>([]);

  function reset() {
    setName('');
    setSelectedLetterIds(new Set());
    setWordInput('');
    setWordChips([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleLetter(cardId: string) {
    setSelectedLetterIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  function handleAddWord() {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    setWordChips((prev) => [
      ...prev,
      { id: `word-${Date.now()}-${prev.length}`, word: trimmed },
    ]);
    setWordInput('');
  }

  function handleRemoveWord(id: string) {
    setWordChips((prev) => prev.filter((chip) => chip.id !== id));
  }

  function handleSave() {
    const selectedLetters = LETTER_SECTIONS.flatMap((s) =>
      s.cards.filter((c) => selectedLetterIds.has(c.id)),
    );
    const wordCards: LetterCard[] = wordChips.map((chip, i) => ({
      id: chip.id,
      letter: chip.word,
      group: 'word',
      order: 1000 + i,
    }));

    const preset: CustomPreset = {
      id: `custom-${Date.now()}`,
      label: name.trim(),
      cards: [...selectedLetters, ...wordCards],
      createdAt: new Date().toISOString(),
    };

    onSave(preset);
    reset();
  }

  const totalSelected = selectedLetterIds.size + wordChips.length;
  const canSave = name.trim().length > 0 && totalSelected > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={creatorStyles.safeArea}>
        {/* Header */}
        <View style={creatorStyles.header}>
          <Pressable
            accessibilityLabel="বন্ধ করুন"
            onPress={handleClose}
            style={({ pressed }) => [creatorStyles.headerBtn, pressed && creatorStyles.headerBtnPressed]}
          >
            <Text style={creatorStyles.headerBtnText}>✕</Text>
          </Pressable>
          <Text style={creatorStyles.headerTitle}>নতুন দ্রুত পথ</Text>
          <Pressable
            accessibilityLabel="সংরক্ষণ করুন"
            disabled={!canSave}
            onPress={handleSave}
            style={({ pressed }) => [
              creatorStyles.saveBtn,
              !canSave && creatorStyles.saveBtnDisabled,
              pressed && canSave && creatorStyles.saveBtnPressed,
            ]}
          >
            <Text style={[creatorStyles.saveBtnText, !canSave && creatorStyles.saveBtnTextDisabled]}>
              সংরক্ষণ
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={creatorStyles.scroll}
          contentContainerStyle={creatorStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name input */}
          <View style={creatorStyles.section}>
            <Text style={creatorStyles.sectionLabel}>পথের নাম</Text>
            <TextInput
              style={creatorStyles.nameInput}
              placeholder="পথের নাম লিখুন..."
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              maxLength={40}
              returnKeyType="done"
            />
          </View>

          {/* Letter selection */}
          <View style={creatorStyles.section}>
            <Text style={creatorStyles.sectionLabel}>
              অক্ষর বাছুন
              {selectedLetterIds.size > 0 ? (
                <Text style={creatorStyles.sectionCount}> · {selectedLetterIds.size}টি বাছা হয়েছে</Text>
              ) : null}
            </Text>
            {LETTER_SECTIONS.map((section) => (
              <View key={section.label} style={creatorStyles.letterGroup}>
                <Text style={creatorStyles.letterGroupLabel}>{section.label}</Text>
                <View style={creatorStyles.letterGrid}>
                  {section.cards.map((card) => {
                    const selected = selectedLetterIds.has(card.id);
                    const display = card.group === 'vowelSign' ? `◌${card.letter}` : card.letter;
                    return (
                      <Pressable
                        key={card.id}
                        accessibilityLabel={`${display} অক্ষর`}
                        accessibilityState={{ selected }}
                        onPress={() => toggleLetter(card.id)}
                        style={({ pressed }) => [
                          creatorStyles.letterCell,
                          selected && creatorStyles.letterCellSelected,
                          pressed && creatorStyles.letterCellPressed,
                        ]}
                      >
                        <Text
                          style={[
                            creatorStyles.letterCellText,
                            selected && creatorStyles.letterCellTextSelected,
                          ]}
                        >
                          {display}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* Word input */}
          <View style={creatorStyles.section}>
            <Text style={creatorStyles.sectionLabel}>শব্দ যোগ করুন</Text>
            <Text style={creatorStyles.sectionHint}>বাংলা শব্দ বা অক্ষর লিখে যোগ করুন</Text>
            <View style={creatorStyles.wordRow}>
              <TextInput
                style={creatorStyles.wordInput}
                placeholder="শব্দ লিখুন..."
                placeholderTextColor="#9ca3af"
                value={wordInput}
                onChangeText={setWordInput}
                onSubmitEditing={handleAddWord}
                returnKeyType="done"
                maxLength={20}
              />
              <Pressable
                accessibilityLabel="শব্দ যোগ করুন"
                disabled={!wordInput.trim()}
                onPress={handleAddWord}
                style={({ pressed }) => [
                  creatorStyles.addWordBtn,
                  !wordInput.trim() && creatorStyles.addWordBtnDisabled,
                  pressed && wordInput.trim() && creatorStyles.addWordBtnPressed,
                ]}
              >
                <Text
                  style={[
                    creatorStyles.addWordBtnText,
                    !wordInput.trim() && creatorStyles.addWordBtnTextDisabled,
                  ]}
                >
                  যোগ করুন
                </Text>
              </Pressable>
            </View>
            {wordChips.length > 0 ? (
              <View style={creatorStyles.chipRow}>
                {wordChips.map((chip) => (
                  <Pressable
                    key={chip.id}
                    accessibilityLabel={`${chip.word} সরান`}
                    onPress={() => handleRemoveWord(chip.id)}
                    style={({ pressed }) => [creatorStyles.chip, pressed && creatorStyles.chipPressed]}
                  >
                    <Text style={creatorStyles.chipText}>{chip.word}</Text>
                    <Text style={creatorStyles.chipRemove}> ✕</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const creatorStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f0e8',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5ddc7',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: { opacity: 0.6 },
  headerBtnText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#111827',
  },
  saveBtnDisabled: {
    backgroundColor: '#e5ddc7',
  },
  saveBtnPressed: { opacity: 0.75 },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f0ece0',
  },
  saveBtnTextDisabled: {
    color: '#9ca3af',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
    paddingTop: 16,
  },

  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f4512a',
  },
  sectionHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: -6,
  },

  nameInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5ddc7',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#faf8f3',
  },

  letterGroup: {
    gap: 8,
  },
  letterGroupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  letterCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e5ddc7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#faf8f3',
  },
  letterCellSelected: {
    borderColor: '#f4512a',
    backgroundColor: '#fff1ee',
  },
  letterCellPressed: { opacity: 0.7 },
  letterCellText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  letterCellTextSelected: {
    color: '#f4512a',
  },

  wordRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wordInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5ddc7',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#faf8f3',
  },
  addWordBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addWordBtnDisabled: {
    backgroundColor: '#e5ddc7',
  },
  addWordBtnPressed: { opacity: 0.75 },
  addWordBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f0ece0',
  },
  addWordBtnTextDisabled: {
    color: '#9ca3af',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff1ee',
    borderWidth: 1,
    borderColor: '#f4512a',
  },
  chipPressed: { opacity: 0.7 },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f4512a',
  },
  chipRemove: {
    fontSize: 11,
    color: '#f4512a',
    fontWeight: '700',
  },
});
