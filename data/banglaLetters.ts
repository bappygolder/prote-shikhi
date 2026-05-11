export type LetterGroup = 'vowel' | 'vowelSign' | 'consonant' | 'number' | 'word';

export type LetterCard = {
  id: string;
  letter: string;
  group: LetterGroup;
  order: number;
};

export type PracticePreset = {
  id: string;
  label: string;
  cards: LetterCard[];
};

// Custom (fast path) preset — extends PracticePreset so it's compatible with all learning functions.
// Word cards use group: 'word' and store the word text in the letter field.
export type CustomPreset = PracticePreset & {
  createdAt: string;
};

export const MASTERY_TARGET = 10;

export const VOWEL_CARDS: LetterCard[] = [
  { id: 'vowel-01', letter: 'অ', group: 'vowel', order: 1 },
  { id: 'vowel-02', letter: 'আ', group: 'vowel', order: 2 },
  { id: 'vowel-03', letter: 'ই', group: 'vowel', order: 3 },
  { id: 'vowel-04', letter: 'ঈ', group: 'vowel', order: 4 },
  { id: 'vowel-05', letter: 'উ', group: 'vowel', order: 5 },
  { id: 'vowel-06', letter: 'ঊ', group: 'vowel', order: 6 },
  { id: 'vowel-07', letter: 'ঋ', group: 'vowel', order: 7 },
  { id: 'vowel-08', letter: 'এ', group: 'vowel', order: 8 },
  { id: 'vowel-09', letter: 'ঐ', group: 'vowel', order: 9 },
  { id: 'vowel-10', letter: 'ও', group: 'vowel', order: 10 },
  { id: 'vowel-11', letter: 'ঔ', group: 'vowel', order: 11 },
];

export const VOWEL_SIGN_CARDS: LetterCard[] = [
  { id: 'vowel-sign-01', letter: 'া', group: 'vowelSign', order: 12 },
  { id: 'vowel-sign-02', letter: 'ি', group: 'vowelSign', order: 13 },
  { id: 'vowel-sign-03', letter: 'ী', group: 'vowelSign', order: 14 },
  { id: 'vowel-sign-04', letter: 'ু', group: 'vowelSign', order: 15 },
  { id: 'vowel-sign-05', letter: 'ূ', group: 'vowelSign', order: 16 },
  { id: 'vowel-sign-06', letter: 'ৃ', group: 'vowelSign', order: 17 },
  { id: 'vowel-sign-07', letter: 'ে', group: 'vowelSign', order: 18 },
  { id: 'vowel-sign-08', letter: 'ৈ', group: 'vowelSign', order: 19 },
  { id: 'vowel-sign-09', letter: 'ো', group: 'vowelSign', order: 20 },
  { id: 'vowel-sign-10', letter: 'ৌ', group: 'vowelSign', order: 21 },
];

export const CONSONANT_CARDS: LetterCard[] = [
  { id: 'consonant-01', letter: 'ক', group: 'consonant', order: 22 },
  { id: 'consonant-02', letter: 'খ', group: 'consonant', order: 23 },
  { id: 'consonant-03', letter: 'গ', group: 'consonant', order: 24 },
  { id: 'consonant-04', letter: 'ঘ', group: 'consonant', order: 25 },
  { id: 'consonant-05', letter: 'ঙ', group: 'consonant', order: 26 },
  { id: 'consonant-06', letter: 'চ', group: 'consonant', order: 27 },
  { id: 'consonant-07', letter: 'ছ', group: 'consonant', order: 28 },
  { id: 'consonant-08', letter: 'জ', group: 'consonant', order: 29 },
  { id: 'consonant-09', letter: 'ঝ', group: 'consonant', order: 30 },
  { id: 'consonant-10', letter: 'ঞ', group: 'consonant', order: 31 },
  { id: 'consonant-11', letter: 'ট', group: 'consonant', order: 32 },
  { id: 'consonant-12', letter: 'ঠ', group: 'consonant', order: 33 },
  { id: 'consonant-13', letter: 'ড', group: 'consonant', order: 34 },
  { id: 'consonant-14', letter: 'ঢ', group: 'consonant', order: 35 },
  { id: 'consonant-15', letter: 'ণ', group: 'consonant', order: 36 },
  { id: 'consonant-16', letter: 'ত', group: 'consonant', order: 37 },
  { id: 'consonant-17', letter: 'থ', group: 'consonant', order: 38 },
  { id: 'consonant-18', letter: 'দ', group: 'consonant', order: 39 },
  { id: 'consonant-19', letter: 'ধ', group: 'consonant', order: 40 },
  { id: 'consonant-20', letter: 'ন', group: 'consonant', order: 41 },
  { id: 'consonant-21', letter: 'প', group: 'consonant', order: 42 },
  { id: 'consonant-22', letter: 'ফ', group: 'consonant', order: 43 },
  { id: 'consonant-23', letter: 'ব', group: 'consonant', order: 44 },
  { id: 'consonant-24', letter: 'ভ', group: 'consonant', order: 45 },
  { id: 'consonant-25', letter: 'ম', group: 'consonant', order: 46 },
  { id: 'consonant-26', letter: 'য', group: 'consonant', order: 47 },
  { id: 'consonant-27', letter: 'র', group: 'consonant', order: 48 },
  { id: 'consonant-28', letter: 'ল', group: 'consonant', order: 49 },
  { id: 'consonant-29', letter: 'শ', group: 'consonant', order: 50 },
  { id: 'consonant-30', letter: 'ষ', group: 'consonant', order: 51 },
  { id: 'consonant-31', letter: 'স', group: 'consonant', order: 52 },
  { id: 'consonant-32', letter: 'হ', group: 'consonant', order: 53 },
];

export const NUMBER_CARDS: LetterCard[] = [
  { id: 'number-0', letter: '০', group: 'number', order: 54 },
  { id: 'number-1', letter: '১', group: 'number', order: 55 },
  { id: 'number-2', letter: '২', group: 'number', order: 56 },
  { id: 'number-3', letter: '৩', group: 'number', order: 57 },
  { id: 'number-4', letter: '৪', group: 'number', order: 58 },
  { id: 'number-5', letter: '৫', group: 'number', order: 59 },
  { id: 'number-6', letter: '৬', group: 'number', order: 60 },
  { id: 'number-7', letter: '৭', group: 'number', order: 61 },
  { id: 'number-8', letter: '৮', group: 'number', order: 62 },
  { id: 'number-9', letter: '৯', group: 'number', order: 63 },
];

export const LETTER_CARDS: LetterCard[] = [
  ...VOWEL_CARDS,
  ...VOWEL_SIGN_CARDS,
  ...CONSONANT_CARDS,
  ...NUMBER_CARDS,
];

export const PRACTICE_PRESETS: PracticePreset[] = [
  {
    id: 'vowels-early',
    label: 'স্বর ১',
    cards: VOWEL_CARDS.slice(0, 6),
  },
  {
    id: 'vowels-late',
    label: 'স্বর ২',
    cards: VOWEL_CARDS.slice(6),
  },
  {
    id: 'vowel-signs',
    label: 'কার চিহ্ন',
    cards: VOWEL_SIGN_CARDS,
  },
  {
    id: 'consonants-ka',
    label: 'ব্যঞ্জন ক',
    cards: CONSONANT_CARDS.slice(0, 5),
  },
  {
    id: 'consonants-cha',
    label: 'ব্যঞ্জন চ',
    cards: CONSONANT_CARDS.slice(5, 10),
  },
  {
    id: 'consonants-ta-hard',
    label: 'ব্যঞ্জন ট',
    cards: CONSONANT_CARDS.slice(10, 15),
  },
  {
    id: 'consonants-ta-soft',
    label: 'ব্যঞ্জন ত',
    cards: CONSONANT_CARDS.slice(15, 20),
  },
  {
    id: 'consonants-pa',
    label: 'ব্যঞ্জন প',
    cards: CONSONANT_CARDS.slice(20, 25),
  },
  {
    id: 'consonants-last',
    label: 'শেষ ব্যঞ্জন',
    cards: CONSONANT_CARDS.slice(25),
  },
  {
    id: 'numbers',
    label: 'সংখ্যা',
    cards: NUMBER_CARDS,
  },
];
