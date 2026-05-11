import { useEffect, useState } from 'react';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
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

type OrderedCard =
  | { type: 'letter'; card: LetterCard }
  | { type: 'word'; id: string; word: string };

const LETTER_SECTIONS: { label: string; cards: LetterCard[] }[] = [
  { label: 'স্বর', cards: VOWEL_CARDS },
  { label: 'কার চিহ্ন', cards: VOWEL_SIGN_CARDS },
  { label: 'ব্যঞ্জন', cards: CONSONANT_CARDS },
  { label: 'সংখ্যা', cards: NUMBER_CARDS },
];

export function CustomPresetCreator({ visible, onClose, onSave }: CustomPresetCreatorProps) {
  const [name, setName] = useState('');
  const [orderedCards, setOrderedCards] = useState<OrderedCard[]>([]);
  const [wordInput, setWordInput] = useState('');

  function reset() {
    setName('');
    setOrderedCards([]);
    setWordInput('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function toggleLetter(card: LetterCard) {
    setOrderedCards((prev) => {
      const exists = prev.some((c) => c.type === 'letter' && c.card.id === card.id);
      if (exists) return prev.filter((c) => !(c.type === 'letter' && c.card.id === card.id));
      return [...prev, { type: 'letter' as const, card }];
    });
  }

  function handleAddWord() {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    const id = `word-${Date.now()}-${orderedCards.length}`;
    setOrderedCards((prev) => [...prev, { type: 'word' as const, id, word: trimmed }]);
    setWordInput('');
  }

  function removeCard(item: OrderedCard) {
    setOrderedCards((prev) => {
      if (item.type === 'letter') {
        return prev.filter((c) => !(c.type === 'letter' && c.card.id === item.card.id));
      }
      return prev.filter((c) => !(c.type === 'word' && c.id === item.id));
    });
  }

  function buildCards(cards: OrderedCard[]): LetterCard[] {
    return cards.map((item, i) => {
      if (item.type === 'letter') return item.card;
      return { id: item.id, letter: item.word, group: 'word' as const, order: 1000 + i };
    });
  }

  function handleSave() {
    const newPreset: CustomPreset = {
      id: `custom-${Date.now()}`,
      label: name.trim(),
      cards: buildCards(orderedCards),
      createdAt: new Date().toISOString(),
    };
    onSave(newPreset);
    reset();
  }

  const canSave = name.trim().length > 0 && orderedCards.length > 0;

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
              {orderedCards.filter((c) => c.type === 'letter').length > 0 ? (
                <Text style={creatorStyles.sectionCount}>
                  {' '}· {orderedCards.filter((c) => c.type === 'letter').length}টি বাছা হয়েছে
                </Text>
              ) : null}
            </Text>
            {LETTER_SECTIONS.map((section) => (
              <View key={section.label} style={creatorStyles.letterGroup}>
                <Text style={creatorStyles.letterGroupLabel}>{section.label}</Text>
                <View style={creatorStyles.letterGrid}>
                  {section.cards.map((card) => {
                    const selected = orderedCards.some(
                      (c) => c.type === 'letter' && c.card.id === card.id,
                    );
                    const display = card.group === 'vowelSign' ? `◌${card.letter}` : card.letter;
                    return (
                      <Pressable
                        key={card.id}
                        accessibilityLabel={`${display} অক্ষর`}
                        accessibilityState={{ selected }}
                        onPress={() => toggleLetter(card)}
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
            {orderedCards.length > 0 ? (
              <View style={creatorStyles.cardList}>
                <Text style={creatorStyles.sectionLabel}>কার্ডের ক্রম</Text>
                <DraggableFlatList
                  data={orderedCards}
                  keyExtractor={(item) => (item.type === 'letter' ? item.card.id : item.id)}
                  onDragEnd={({ data }) => setOrderedCards(data)}
                  renderItem={({ item, drag, isActive }: RenderItemParams<OrderedCard>) => {
                    const label =
                      item.type === 'letter'
                        ? item.card.group === 'vowelSign'
                          ? `◌${item.card.letter}`
                          : item.card.letter
                        : item.word;
                    return (
                      <ScaleDecorator>
                        <Pressable
                          onLongPress={drag}
                          style={[creatorStyles.cardRow, isActive && creatorStyles.cardRowActive]}
                        >
                          <Text style={creatorStyles.cardRowText}>{label}</Text>
                          <Text style={creatorStyles.dragHandle}>⠿</Text>
                          <Pressable
                            onPress={() => removeCard(item)}
                            style={creatorStyles.cardRowRemove}
                          >
                            <Text style={creatorStyles.cardRowRemoveText}>✕</Text>
                          </Pressable>
                        </Pressable>
                      </ScaleDecorator>
                    );
                  }}
                />
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

  cardList: {
    gap: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e5ddc7',
  },
  cardRowActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    backgroundColor: '#f0ece0',
  },
  cardRowText: {
    flex: 1,
    fontSize: 22,
    color: '#111827',
    fontWeight: '600',
  },
  dragHandle: {
    fontSize: 18,
    color: '#9ca3af',
    paddingHorizontal: 8,
  },
  cardRowRemove: {
    padding: 4,
  },
  cardRowRemoveText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '700',
  },
});
