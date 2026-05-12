import { useCallback, useEffect, useMemo, useState } from 'react';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
import { parseWordInput } from '../../lib/wordInput';

export type CustomPresetCreatorProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (preset: CustomPreset) => void;
  preset?: CustomPreset;
  onPractice?: (cards: LetterCard[]) => void;
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

// numColumns is a valid FlatList prop preserved through DraggableFlatListProps<T>
// (Modify<FlatListProps<T>, overrides> keeps props not in the overrides object)
const CARD_COLUMNS = 3;

export function CustomPresetCreator({ visible, onClose, onSave, preset, onPractice }: CustomPresetCreatorProps) {
  const [name, setName] = useState('');
  const [orderedCards, setOrderedCards] = useState<OrderedCard[]>([]);
  const [wordInput, setWordInput] = useState('');
  const [letterPickerExpanded, setLetterPickerExpanded] = useState(false);
  const [showWordHint, setShowWordHint] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tileSize = useMemo(() => {
    const MODAL_MAX_WIDTH = 540;
    const CONTENT_PADDING_H = 32; // 16px each side from scrollContent.paddingHorizontal
    const TILE_GAP = 8;
    const contentWidth = Math.min(windowWidth, MODAL_MAX_WIDTH) - CONTENT_PADDING_H;
    return Math.floor((contentWidth - TILE_GAP * (CARD_COLUMNS - 1)) / CARD_COLUMNS);
  }, [windowWidth]);

  useEffect(() => {
    if (!visible || !preset) return;
    setName(preset.label);
    setOrderedCards(
      preset.cards.map((card) =>
        card.group === 'word'
          ? { type: 'word' as const, id: card.id, word: card.letter }
          : { type: 'letter' as const, card },
      ),
    );
  }, [visible, preset]);

  function reset() {
    setName('');
    setOrderedCards([]);
    setWordInput('');
    setLetterPickerExpanded(false);
    setShowWordHint(false);
    setEditingId(null);
    setEditingText('');
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
    const words = parseWordInput(wordInput);
    if (words.length === 0) return;
    const now = Date.now();
    setOrderedCards((prev) => [
      ...prev,
      ...words.map((word, i) => ({
        type: 'word' as const,
        id: `word-${now + i}-${prev.length + i}`,
        word,
      })),
    ]);
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

  function commitEdit() {
    if (!editingId || !editingText.trim()) {
      setEditingId(null);
      return;
    }
    setOrderedCards((prev) =>
      prev.map((c) =>
        c.type === 'word' && c.id === editingId ? { ...c, word: editingText.trim() } : c,
      ),
    );
    setEditingId(null);
  }

  function buildCards(cards: OrderedCard[]): LetterCard[] {
    return cards.map((item, i) => {
      if (item.type === 'letter') return item.card;
      return { id: item.id, letter: item.word, group: 'word' as const, order: 1000 + i };
    });
  }

  function handleSave() {
    const cards = buildCards(orderedCards);
    const saved: CustomPreset = preset
      ? { ...preset, label: name.trim(), cards }
      : { id: `custom-${Date.now()}`, label: name.trim(), cards, createdAt: new Date().toISOString() };
    onSave(saved);
    reset();
  }

  function handlePractice() {
    onPractice?.(buildCards(orderedCards));
  }

  const canSave = name.trim().length > 0 && orderedCards.length > 0;
  const letterCount = orderedCards.filter((c) => c.type === 'letter').length;

  const renderOrderedCard = useCallback(
    ({ item, drag, isActive }: RenderItemParams<OrderedCard>) => {
      const label =
        item.type === 'letter'
          ? item.card.group === 'vowelSign'
            ? `◌${item.card.letter}`
            : item.card.letter
          : item.word;

      const isEditing = item.type === 'word' && editingId === item.id;

      return (
        <ScaleDecorator activeScale={1.06}>
          <Pressable
            onPressIn={drag}
            style={[
              creatorStyles.cardTile,
              { width: tileSize, height: tileSize },
              isActive && creatorStyles.cardTileActive,
            ]}
          >
            {isEditing ? (
              <TextInput
                style={creatorStyles.tileEditInput}
                value={editingText}
                onChangeText={setEditingText}
                onSubmitEditing={commitEdit}
                onBlur={commitEdit}
                autoFocus
                maxLength={20}
                textAlign="center"
                returnKeyType="done"
              />
            ) : (
              <View style={creatorStyles.tileLabelArea}>
                <Text
                  style={creatorStyles.cardTileText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {label}
                </Text>
              </View>
            )}
            {!isEditing && item.type === 'word' && (
              <Pressable
                onPress={() => {
                  setEditingId(item.id);
                  setEditingText(item.word);
                }}
                style={creatorStyles.tileEditBtn}
                hitSlop={4}
              >
                <Text style={creatorStyles.tileEditBtnText}>✎</Text>
              </Pressable>
            )}
            {!isEditing && (
              <View style={creatorStyles.tileDragHandle}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={creatorStyles.tileDragDot} />
                ))}
              </View>
            )}
            <Pressable
              onPress={() => removeCard(item)}
              style={creatorStyles.tileRemoveBtn}
              hitSlop={6}
            >
              <Text style={creatorStyles.tileRemoveBtnText}>✕</Text>
            </Pressable>
          </Pressable>
        </ScaleDecorator>
      );
    },
    [editingId, editingText, removeCard, commitEdit],
  );

  const CreatorHeader = (
    <>
      {/* Path name */}
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

      {/* Letter picker — collapsible, hidden by default */}
      <View style={creatorStyles.section}>
        <Pressable
          accessibilityLabel={letterPickerExpanded ? 'অক্ষর তালিকা লুকান' : 'অক্ষর তালিকা দেখান'}
          onPress={() => setLetterPickerExpanded((v) => !v)}
          style={({ pressed }) => [
            creatorStyles.sectionToggleRow,
            pressed && creatorStyles.sectionToggleRowPressed,
          ]}
        >
          <Text style={creatorStyles.sectionLabel}>
            অক্ষর বাছুন
            {letterCount > 0 ? (
              <Text style={creatorStyles.sectionCount}> · {letterCount}টি বাছা হয়েছে</Text>
            ) : null}
          </Text>
          <Text style={creatorStyles.sectionToggleIcon}>
            {letterPickerExpanded ? '▲' : '▼'}
          </Text>
        </Pressable>
        {letterPickerExpanded
          ? LETTER_SECTIONS.map((section) => (
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
            ))
          : null}
      </View>

      {/* Word input */}
      <View style={creatorStyles.section}>
        <View style={creatorStyles.sectionLabelRow}>
          <Text style={creatorStyles.sectionLabel}>শব্দ বা অক্ষর যোগ করুন</Text>
          <Pressable
            accessibilityLabel="কীভাবে যোগ করবেন"
            onPress={() => setShowWordHint((v) => !v)}
            style={creatorStyles.infoBtn}
          >
            <Text style={creatorStyles.infoIcon}>ℹ</Text>
          </Pressable>
        </View>
        {showWordHint ? (
          <Text style={creatorStyles.wordHintText}>
            কমা (,) দিয়ে আলাদা করে একসাথে একাধিক শব্দ যোগ করুন। যেমন: আম, জাম, কলা
          </Text>
        ) : null}
        <View style={creatorStyles.wordRow}>
          <TextInput
            style={creatorStyles.wordInput}
            placeholder="শব্দ লিখুন... (কমা দিয়ে আলাদা করুন)"
            placeholderTextColor="#9ca3af"
            value={wordInput}
            onChangeText={setWordInput}
            onSubmitEditing={handleAddWord}
            returnKeyType="done"
            maxLength={120}
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
      </View>

      {/* Card list header */}
      {orderedCards.length > 0 ? (
        <View style={creatorStyles.cardListHeaderRow}>
          <Text style={creatorStyles.sectionLabel}>যোগ করা কার্ড</Text>
          <Text style={creatorStyles.sectionCount}>{orderedCards.length}টি</Text>
        </View>
      ) : null}
    </>
  );

  const innerContent = (
    <>
      {/* Modal header */}
      <View style={creatorStyles.header}>
        <Pressable
          accessibilityLabel="বন্ধ করুন"
          onPress={handleClose}
          style={({ pressed }) => [creatorStyles.headerBtn, pressed && creatorStyles.headerBtnPressed]}
        >
          <Text style={creatorStyles.headerBtnText}>✕</Text>
        </Pressable>
        <Text style={creatorStyles.headerTitle}>{preset ? 'পথ সম্পাদনা' : 'নতুন দ্রুত পথ'}</Text>
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

      {/* @ts-ignore — numColumns is a valid FlatList prop preserved by DraggableFlatListProps */}
      <DraggableFlatList
        data={orderedCards}
        keyExtractor={(item) => (item.type === 'letter' ? item.card.id : item.id)}
        onDragEnd={({ data }) => setOrderedCards(data)}
        renderItem={renderOrderedCard}
        ListHeaderComponent={CreatorHeader}
        contentContainerStyle={creatorStyles.scrollContent}
        style={creatorStyles.list}
        numColumns={CARD_COLUMNS}
        columnWrapperStyle={creatorStyles.columnWrapper}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        activationDistance={8}
        dragItemOverflow
      />
      {onPractice ? (
        <View style={creatorStyles.footer}>
          <Pressable
            accessibilityLabel="অনুশীলন করুন"
            disabled={orderedCards.length === 0}
            onPress={handlePractice}
            style={({ pressed }) => [
              creatorStyles.practiceBtn,
              orderedCards.length === 0 && creatorStyles.practiceBtnDisabled,
              pressed && orderedCards.length > 0 && creatorStyles.practiceBtnPressed,
            ]}
          >
            <Text
              style={[
                creatorStyles.practiceBtnText,
                orderedCards.length === 0 && creatorStyles.practiceBtnTextDisabled,
              ]}
            >
              অনুশীলন করুন
            </Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent={Platform.OS === 'web'}
      presentationStyle={Platform.OS === 'web' ? undefined : 'pageSheet'}
      onRequestClose={handleClose}
    >
      {Platform.OS === 'web' ? (
        <View style={creatorStyles.webBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={[creatorStyles.webInner, { maxHeight: windowHeight * 0.88 }]}>
            <SafeAreaView style={[creatorStyles.safeArea, creatorStyles.webSafeArea]}>
              {innerContent}
            </SafeAreaView>
          </View>
        </View>
      ) : (
        <SafeAreaView style={creatorStyles.safeArea}>
          {innerContent}
        </SafeAreaView>
      )}
    </Modal>
  );
}

const creatorStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f0e8',
  },
  list: {
    flex: 1,
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

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
    paddingTop: 16,
  },

  section: {
    gap: 8,
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
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionToggleRowPressed: {
    opacity: 0.6,
  },
  sectionToggleIcon: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
  },

  infoBtn: {
    padding: 2,
  },
  infoIcon: {
    fontSize: 15,
    color: '#8b5cf6',
    fontWeight: '700',
  },
  wordHintText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
    backgroundColor: '#f3f0e8',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: -4,
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

  cardListHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Square tile grid
  columnWrapper: {
    gap: 8,
    justifyContent: 'flex-start',
  },
  cardTile: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5ddc7',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardTileActive: {
    borderColor: '#f4512a',
    backgroundColor: '#fff1ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  tileLabelArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  cardTileText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  tileEditInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  tileEditBtn: {
    position: 'absolute',
    top: 4,
    left: 26,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e5ddc7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEditBtnText: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '800',
    lineHeight: 10,
  },
  tileRemoveBtn: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e5ddc7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileRemoveBtnText: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '800',
    lineHeight: 10,
  },
  tileDragHandle: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    pointerEvents: 'none',
  },
  tileDragDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#c8c0ad',
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5ddc7',
  },
  practiceBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  practiceBtnDisabled: {
    backgroundColor: '#e5ddc7',
  },
  practiceBtnPressed: { opacity: 0.8 },
  practiceBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  practiceBtnTextDisabled: {
    color: '#9ca3af',
  },

  webBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  webInner: {
    width: '100%',
    maxWidth: 540,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  webSafeArea: {
    flex: 1,
  },
});
