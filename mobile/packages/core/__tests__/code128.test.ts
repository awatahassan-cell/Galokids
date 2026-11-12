/**
 * The barcode encoder, checked against itself and against the specification.
 *
 * A wrong barcode is the worst kind of bug to find late: the label looks
 * perfect, the shop prints a roll of two hundred, and the scanner beeps at
 * none of them. So this encodes values and reads them back, and checks the
 * fixed parts against the numbers in the specification rather than against
 * whatever the encoder happens to produce.
 *
 * Run with: npm run test --workspace @galokids/core
 */

import assert from 'node:assert/strict';
import {
  canEncodeCode128,
  code128DataUri,
  code128Svg,
  code128Widths,
  decodeCode128Widths,
} from '../src/code128';

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

console.log('\ncode128\n');

test('a shop code survives the round trip', () => {
  const widths = code128Widths('GALO000001');
  assert.ok(widths);
  assert.equal(decodeCode128Widths(widths!), 'GALO000001');
});

test('every printable character encodes and decodes', () => {
  // The whole of subset B, in chunks, so a single bad entry in the pattern
  // table cannot hide behind the characters the shop happens to use.
  const all = Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join('');

  for (let start = 0; start < all.length; start += 10) {
    const chunk = all.slice(start, start + 10);
    const widths = code128Widths(chunk);

    assert.ok(widths, `could not encode ${JSON.stringify(chunk)}`);
    assert.equal(decodeCode128Widths(widths!), chunk);
  }
});

test('the start and stop patterns are the ones the specification names', () => {
  const widths = code128Widths('A')!;

  // Start B is 11 modules wide and is 211214; the stop is 13 and is 2331112.
  assert.equal(widths.slice(0, 6).join(''), '211214');
  assert.equal(widths.slice(-7).join(''), '2331112');
});

test('the check digit is the weighted sum, and a wrong one is rejected', () => {
  // "A" is value 33. Start B (104) + 33*1 = 137, and 137 % 103 = 34, whose
  // pattern is 131123. Worked out by hand from the specification, not from the
  // encoder, so the encoder has to agree with the spec rather than itself.
  const widths = code128Widths('A')!;
  const checkPattern = widths.slice(12, 18).join('');

  assert.equal(checkPattern, '131123');

  // Corrupt it and the decoder must refuse rather than return a plausible value.
  const corrupted = [...widths];
  corrupted.splice(12, 6, ...[...'111224'].map(Number)); // the pattern for 63

  assert.equal(decodeCode128Widths(corrupted), null);
});

test('every symbol is an odd-parity set of 11 modules', () => {
  // The property that makes CODE128 readable in either direction. If a pattern
  // in the table were mistyped, this is what would catch it.
  const widths = code128Widths('Galo 123!')!;
  const body = widths.slice(0, widths.length - 7);

  assert.equal(body.length % 6, 0);

  for (let index = 0; index < body.length; index += 6) {
    const sum = body.slice(index, index + 6).reduce((total, width) => total + width, 0);
    assert.equal(sum, 11, `symbol at ${index / 6} is ${sum} modules, not 11`);
  }

  assert.equal(widths.slice(-7).reduce((total, width) => total + width, 0), 13);
});

test('the SVG draws a bar for every bar and nothing for the spaces', () => {
  const rendered = code128Svg('GALO000042', { moduleWidth: 2, height: 50 })!;
  assert.ok(rendered);

  const widths = code128Widths('GALO000042')!;
  const expectedBars = widths.filter((_, index) => index % 2 === 0).length;
  const drawn = rendered.svg.match(/<rect x=/g)?.length ?? 0;

  assert.equal(drawn, expectedBars);
  assert.ok(rendered.svg.startsWith('<svg'));
  assert.ok(rendered.svg.includes('GALO000042'), 'the code should be printed under the bars');
});

test('the quiet zone is kept at both ends', () => {
  const rendered = code128Svg('A', { moduleWidth: 1, quietZone: 10, showText: false })!;
  const firstBarAt = Number(/x="(\d+)"/.exec(rendered.svg.split('<g')[1]!)![1]);

  assert.equal(firstBarAt, 10);

  // Total width is quiet zone + symbols + quiet zone.
  const modules = code128Widths('A')!.reduce((total, width) => total + width, 0);
  assert.equal(rendered.width, modules + 20);
});

test('text adds height, and turning it off takes it away', () => {
  const withText = code128Svg('GALO1', { height: 40, fontSize: 12 })!;
  const without = code128Svg('GALO1', { height: 40, showText: false })!;

  assert.equal(without.height, 40);
  assert.equal(withText.height, 40 + 12 + 4);
});

test('a code the symbology cannot carry is refused rather than mangled', () => {
  // Kurdish text has no place in a barcode. Returning null lets the screen say
  // so; encoding the low byte of each character would print a scannable label
  // that decodes to nonsense.
  assert.equal(canEncodeCode128('گەلۆ'), false);
  assert.equal(code128Svg('گەلۆ'), null);
  assert.equal(code128Widths('گەلۆ'), null);
  assert.equal(code128Svg(''), null);
  assert.equal(code128Svg('   '), null);
});

test('a data URI is produced, and XML-special characters are escaped', () => {
  const uri = code128DataUri('GALO000001');
  assert.ok(uri?.startsWith('data:image/svg+xml;utf8,'));

  const rendered = code128Svg('A&B<C>')!;
  assert.ok(rendered.svg.includes('A&amp;B&lt;C&gt;'));
  assert.ok(!/>A&B<C>/.test(rendered.svg));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
