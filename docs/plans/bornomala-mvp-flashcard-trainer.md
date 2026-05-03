# Bornomala MVP Flashcard Trainer

**Last updated**: 2026-05-04

## Recommended Model
- Model: GPT-5.1 or GPT-5.2
- Complexity: Medium
- Reason: The first build is simple, but the learning loop needs careful product judgment.

## Goal

Create the fastest possible mobile-first MVP for human-assisted Bangla letter recognition practice.

The first user test should let a teacher show a learner one Bangla letter at a time, listen to the learner's response, and mark the card Right or Wrong.

## Confirmed Decisions

- Product name: Bornomala
- Repo name: `bornomala`
- Platform direction: React Native with Expo, Android and iOS
- Learner-facing card: Bangla letter only, no helper text
- MVP grading: Right / Wrong only
- Mastery rule: 10 correct responses per letter
- First content sequence: vowels first
- Audio pronunciation: not in MVP
- Letter tracing: not in MVP
- Accounts/cloud sync: not in MVP
- Detailed per-card analytics: important later, but not required for the first test

## First Screen

The first screen should feel like a simple teaching tool, not a game or course dashboard.

Core UI:
- One large Bangla letter
- Session progress
- Mastery progress
- Right and Wrong controls
- Next card chosen automatically

## Learning Loop

1. Show a Bangla vowel card.
2. Learner says the letter/sound out loud.
3. Teacher taps Right or Wrong.
4. App updates counts for that letter.
5. Letter is considered mastered when it reaches 10 correct responses.
6. Scheduler keeps showing unmastered letters, with weaker letters appearing more often.

## Review Target

The first iteration should be reviewable in a mobile viewport the same day as scaffolding. It does not need audio, accounts, cloud storage, or full analytics.

## Later Phases

- Consonants
- Vowel signs
- Combined letters
- Two-letter words
- Three-letter words
- Sentences
- Audio
- Per-card attempt history
- Daily review
- Custom decks from practical text
