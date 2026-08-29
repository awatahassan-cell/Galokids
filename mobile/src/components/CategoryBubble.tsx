import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { T } from './ui';

/**
 * A category, drawn as the website draws it: a tinted circle with a glyph,
 * and the name underneath.
 *
 * The website picks a real icon set for these. On the phone the same job is
 * done with an emoji chosen from the icon name the shop saved in the admin
 * panel — the mapping is by name, so choosing "dress" for a category in the
 * panel puts a dress here, and no font has to load before the first frame.
 */
const ICONS: Record<string, string> = {
  shirt: '👕',
  dress: '👗',
  skirt: '👗',
  trousers: '👖',
  jacket: '🧥',
  clothes: '🧺',
  socks: '🧦',
  shoes: '👟',
  boots: '🥾',
  bag: '👜',
  backpack: '🎒',
  hat: '🧢',
  cap: '🧢',
  bow: '🎀',
  glasses: '🕶️',
  watch: '⌚',
  toy: '🧸',
  teddy: '🧸',
  ball: '⚽',
  blocks: '🧱',
  puzzle: '🧩',
  bike: '🚲',
  baby: '👶',
  pram: '🍼',
  bottle: '🍼',
  gift: '🎁',
  school: '🎓',
  party: '🎉',
  summer: '☀️',
  winter: '❄️',
  rain: '☔',
  sparkle: '✨',
};

/** The tints rotate so a row of circles is not one flat colour. */
const TINTS = [
  colors.candy[50],
  colors.bubble[50],
  colors.sunny[100],
  colors.grape[50],
  colors.mint[50],
];

export const CategoryBubble = memo(function CategoryBubble({
  label,
  icon,
  index = 0,
  onPress,
}: {
  label: string;
  icon?: string;
  index?: number;
  onPress: () => void;
}) {
  const glyph = (icon && ICONS[icon]) || guessFromName(label) || '✨';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        width: 76,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.pill,
          backgroundColor: TINTS[index % TINTS.length],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 28 }}>{glyph}</Text>
      </View>

      <T
        size="xs"
        weight="black"
        color={colors.slate[600]}
        numberOfLines={1}
        center
        style={{ marginTop: spacing.sm, width: 76 }}
      >
        {label}
      </T>
    </Pressable>
  );
});

/**
 * A shop that never opened the icon picker still gets something sensible,
 * read from the category's own name in any of the three languages.
 */
function guessFromName(name: string): string | null {
  const n = name.toLowerCase();
  const map: [string, string[]][] = [
    ['👗', ['dress', 'فستان', 'کراس', 'girl', 'بنات', 'کچ']],
    ['👕', ['shirt', 'قميص', 'تیشێرت', 'boy', 'أولاد', 'کوڕ']],
    ['👖', ['pant', 'trouser', 'jean', 'بنطال', 'پانتۆڵ']],
    ['🧥', ['jacket', 'coat', 'معطف', 'چاکەت', 'winter', 'زستان']],
    ['👟', ['shoe', 'حذاء', 'پێڵاو']],
    ['🎒', ['bag', 'حقيبة', 'جانتا', 'چانتە']],
    ['🧸', ['toy', 'لعبة', 'یاری']],
    ['👶', ['baby', 'رضيع', 'ساوا']],
    ['🎁', ['gift', 'هدية', 'دیاری', 'accessor', 'إكسسوار', 'ئەکسسوار']],
  ];

  for (const [glyph, keys] of map) {
    if (keys.some(key => n.includes(key))) return glyph;
  }
  return null;
}
