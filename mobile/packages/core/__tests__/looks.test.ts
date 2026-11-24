import assert from 'node:assert/strict';
import { defaultHotspot, guessSlot, resolveChoice, sizesOf, sortSizes } from '../src/looks';
import type { Product } from '../src/types';

const variation = (id: number, color: string, size: string, stock: number) => ({
  id, product_id: 1, color, size, stock_quantity: stock, sku: null, barcode: null, price_override: null,
});
const product = (variations: ReturnType<typeof variation>[]) => ({ id: 1, variations } as unknown as Product);

const test = (name: string, fn: () => void) => { fn(); console.log(`  ok  ${name}`); };

test('sizes read in a parent\'s order, not alphabetically', () => {
  assert.deepEqual(sortSizes(['10-11', '2-3', '4-5']), ['2-3', '4-5', '10-11']);
});

test('the outfit offers every size any piece has, once', () => {
  const a = product([variation(1, 'Red', '2-3', 1), variation(2, 'Red', '4-5', 1)]);
  const b = product([variation(3, 'Blue', '4-5', 1), variation(4, 'Blue', '6-7', 1)]);
  assert.deepEqual(sizesOf([a, b]), ['2-3', '4-5', '6-7']);
});

test('one chosen size picks a colour that has it in stock', () => {
  const p = product([variation(1, 'Red', '4-5', 0), variation(2, 'Blue', '4-5', 3)]);
  const choice = resolveChoice(p, undefined, '4-5');
  assert.equal(choice.color, 'Blue');
  assert.equal(choice.variation?.id, 2);
});

test('a colour the shopper chose is respected even when it is sold out in that size', () => {
  const p = product([variation(1, 'Red', '4-5', 0), variation(2, 'Blue', '4-5', 3)]);
  const choice = resolveChoice(p, { color: 'Red' }, '4-5');
  assert.equal(choice.color, 'Red');
  assert.equal(choice.variation?.stock_quantity, 0);
});

test('a size the piece does not come in resolves to no variation', () => {
  const p = product([variation(1, 'Red', '2-3', 5)]);
  assert.equal(resolveChoice(p, undefined, '6-7').variation, undefined);
});

test('with no size chosen a piece opens on something that can be bought', () => {
  const p = product([variation(1, 'Red', '2-3', 0), variation(2, 'Red', '4-5', 2)]);
  assert.equal(resolveChoice(p, undefined, null).variation?.id, 2);
});

test('slots are guessed from the name in three languages', () => {
  assert.equal(guessSlot('Party Shoes'), 'shoes');
  assert.equal(guessSlot('پێڵاوی ئاهەنگ'), 'shoes');
  assert.equal(guessSlot('Denim Jeans'), 'bottom');
  assert.equal(guessSlot('Flower Dress'), 'top');
  assert.equal(guessSlot('Sun Hat'), 'hat');
  assert.equal(guessSlot('Backpack'), 'other');
});

test('two pieces in one slot do not share a dot position', () => {
  assert.notDeepEqual(defaultHotspot('top', 0), defaultHotspot('top', 1));
  assert.equal(defaultHotspot('shoes').y > defaultHotspot('top').y, true);
});

console.log('looks: all passed');
