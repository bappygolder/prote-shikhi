export type LetterGroup = 'vowel' | 'consonant';

export type LetterCard = {
  id: string;
  letter: string;
  group: LetterGroup;
  order: number;
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
