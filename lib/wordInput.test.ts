import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWordInput } from './wordInput';

test('parseWordInput: empty string returns []', () => {
  assert.deepEqual(parseWordInput(''), []);
});

test('parseWordInput: single word, no comma', () => {
  assert.deepEqual(parseWordInput('আম'), ['আম']);
});

test('parseWordInput: comma-separated words', () => {
  assert.deepEqual(parseWordInput('আম, জাম, কলা'), ['আম', 'জাম', 'কলা']);
});

test('parseWordInput: trims whitespace around each entry', () => {
  assert.deepEqual(parseWordInput('  আম  ,  জাম  '), ['আম', 'জাম']);
});

test('parseWordInput: skips empty segments from trailing/double commas', () => {
  assert.deepEqual(parseWordInput('আম,,কলা,'), ['আম', 'কলা']);
});

test('parseWordInput: single letter', () => {
  assert.deepEqual(parseWordInput('ক'), ['ক']);
});
