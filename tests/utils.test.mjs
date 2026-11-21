import test from 'node:test';
import assert from 'node:assert/strict';
import * as utils from '../utils.mjs';

test('together-day counter changes at Jakarta midnight', () => {
  assert.equal(typeof utils.calendarDaysSince, 'function');
  assert.equal(utils.calendarDaysSince('2025-11-22', new Date('2025-11-22T16:59:59Z')), 0);
  assert.equal(utils.calendarDaysSince('2025-11-22', new Date('2025-11-22T17:00:00Z')), 1);
});
test('the first anniversary is 365 days after the relationship began', () => {
  assert.equal(typeof utils.calendarDaysSince, 'function');
  assert.equal(utils.calendarDaysSince('2025-11-22', new Date('2026-11-21T17:00:00Z')), 365);
});
test('dates before the relationship never show a negative counter', () => {
  assert.equal(typeof utils.calendarDaysSince, 'function');
  assert.equal(utils.calendarDaysSince('2025-11-22', new Date('2025-01-01T00:00:00Z')), 0);
});
const memories = [
  { date: '2025-11-22', id: 'first' },
  { date: '2026-03-31', id: 'march' },
  { date: '2026-04-01', id: 'april' },
  { date: '2026-07-01', id: 'july' },
  { date: '2026-10-25', id: 'beach' },
];
test('quarter filters include both ends without leaking adjacent quarters', () => {
  assert.equal(typeof utils.filterMemories, 'function');
  assert.deepEqual(utils.filterMemories(memories, '2026-q1').map(x => x.id), ['march']);
  assert.deepEqual(utils.filterMemories(memories, '2026-q2').map(x => x.id), ['april']);
  assert.deepEqual(utils.filterMemories(memories, '2026-q3').map(x => x.id), ['july']);
  assert.deepEqual(utils.filterMemories(memories, '2026-q4').map(x => x.id), ['beach']);
});
test('all, year and empty filters return the correct memories without mutating source', () => {
  assert.equal(typeof utils.filterMemories, 'function');
  assert.equal(utils.filterMemories(memories, 'all').length, 5);
  assert.deepEqual(utils.filterMemories(memories, '2025').map(x => x.id), ['first']);
  assert.deepEqual(utils.filterMemories(memories, 'unknown'), []);
  assert.equal(memories.length, 5);
});
