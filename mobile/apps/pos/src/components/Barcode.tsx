import { View } from 'react-native';
import { code128Widths } from '@galokids/core';
import { colors } from '@/theme';

/**
 * A barcode on screen.
 *
 * Drawn as plain coloured `View`s — one per bar — rather than as an SVG or a
 * canvas. Both of those need a library, and the two obvious candidates each
 * work on one platform and not the other: a canvas is a browser thing, and
 * `react-native-svg` is another native module to build into the till.
 *
 * A label has about a hundred bars, which is nothing to lay out, and the
 * result is identical on a phone, a tablet and in a browser. The same widths
 * drive the printed label, so what the cashier checks here is what comes off
 * the printer.
 */
export function Barcode({
  value,
  height = 56,
  moduleWidth = 2,
}: {
  value: string;
  height?: number;
  moduleWidth?: number;
}) {
  const widths = code128Widths(value);

  // Kurdish or Arabic text in a code field, or an empty one. The screen says
  // so in words; drawing nothing here is right, because there is no honest
  // barcode to draw.
  if (!widths) return null;

  return (
    <View style={{ flexDirection: 'row', height, alignItems: 'stretch' }}>
      {widths.map((width, index) => (
        <View
          key={index}
          style={{
            width: width * moduleWidth,
            // Widths alternate bar, space, bar, space… starting with a bar.
            backgroundColor: index % 2 === 0 ? colors.text : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
