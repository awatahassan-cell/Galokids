/**
 * Dates, checked without trusting the machine's locale data.
 *
 * The reason this file exists: `Intl.DateTimeFormat('ckb-IQ')` gives correct
 * Kurdish months under Node and the literal string "M11" under Chrome, whose
 * ICU has no Kurdish data — and so does many an Android phone. The shop's own
 * customers were being shown "M11 12" for their order dates.
 *
 * Run with: npm run test --workspace @galokids/core
 */

import assert from 'node:assert/strict';
import { formatDateTime, formatDay, timeAgo, toDateKey } from '../src/dates';

let passed = 0;
let failed = 0;

function test(name: string, body: () => void) {
  try {
    body();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}`);
    console.log(`      ${(error as Error).message.split('\n')[0]}`);
  }
}

console.log('\ndates\n');

test('every month has a Kurdish name, and none of them is "M11"', () => {
  const seen = new Set<string>();

  for (let month = 0; month < 12; month += 1) {
    const rendered = formatDay(new Date(2026, month, 15));

    assert.match(rendered, /^15 \S/, `month ${month + 1} rendered as ${rendered}`);
    assert.doesNotMatch(rendered, /M\d/, 'the root-locale fallback has leaked in');
    assert.doesNotMatch(rendered, /[A-Za-z]/, 'the month should be in Kurdish');

    seen.add(rendered);
  }

  assert.equal(seen.size, 12, 'two months share a name');
});

test('the day and the month are the right way round', () => {
  assert.equal(formatDay(new Date(2026, 10, 12)), '12 تشرینی دووەم');
});

test('a time is 24 hour and zero padded', () => {
  assert.equal(formatDateTime(new Date(2026, 10, 12, 9, 5)), '12 تشرینی دووەم · 09:05');
  assert.equal(formatDateTime(new Date(2026, 10, 12, 19, 26)), '12 تشرینی دووەم · 19:26');
  assert.equal(formatDateTime(new Date(2026, 10, 12, 0, 0)), '12 تشرینی دووەم · 00:00');
});

test('nonsense in gives an empty string, not "Invalid Date"', () => {
  assert.equal(formatDay('not a date'), '');
  assert.equal(formatDateTime('not a date'), '');
  assert.equal(timeAgo(null), '—');
  assert.equal(timeAgo('not a date'), '—');
});

test('a date key is the local day, not a UTC one', () => {
  // 11pm local on the 12th is already the 13th in UTC. A shop closing its till
  // at eleven should see the takings under the day it worked.
  assert.equal(toDateKey(new Date(2026, 10, 12, 23, 30)), '2026-11-12');
  assert.equal(toDateKey(new Date(2026, 0, 1)), '2026-01-01');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
