import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * One layout that works on a phone at the counter and a browser on a desk.
 *
 * The same screens serve both, so rather than each one guessing at widths they
 * ask here. The breakpoint is where two columns of product cards stop being
 * cramped — a 10" till tablet in landscape and a laptop both land in `wide`.
 */

export interface Layout {
  width: number;
  /** Phone, or a narrow browser window. One column, bottom navigation. */
  compact: boolean;
  /** Tablet or desktop. Side navigation, more columns. */
  wide: boolean;
  /** How many product cards fit across. */
  columns: number;
  /** Side padding: generous on a wide screen, tight on a phone. */
  gutter: number;
  /** The widest a column of text or a form should ever get. */
  maxContentWidth: number;
}

const WIDE_FROM = 768;

export function useLayout(): Layout {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const wide = width >= WIDE_FROM;

    return {
      width,
      wide,
      compact: !wide,
      columns: width >= 1280 ? 5 : width >= 1024 ? 4 : wide ? 3 : 2,
      gutter: wide ? 24 : 16,
      // Beyond this a line of text is tiring to read and a form looks adrift.
      maxContentWidth: 1200,
    };
  }, [width]);
}
