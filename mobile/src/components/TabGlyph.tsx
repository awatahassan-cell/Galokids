import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The five tab-bar icons.
 *
 * Drawn here rather than pulled from an icon package: the app needs exactly
 * these five, and the packages that carry them for React Native either ship a
 * font (which has to be loaded before the first frame, and shows boxes until
 * it is) or several thousand components. Five paths on Lucide's own 24×24
 * grid — 2px stroke, round caps — keep the app's icons matching the website's
 * without any of that.
 *
 * Everything else in the app uses text or emoji, which need no loading.
 */
export type TabGlyphName = 'home' | 'shop' | 'basket' | 'heart' | 'user';

const PATHS: Record<TabGlyphName, React.ReactNode> = {
  home: (
    <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <Path d="M9.5 21v-6h5v6" />
    </>
  ),
  shop: (
    <>
      <Path d="M3.5 9h17l-1 11a1 1 0 0 1-1 .9H5.5a1 1 0 0 1-1-.9z" />
      <Path d="M3.5 9 5 4.5h14L20.5 9" />
      <Path d="M9 13a3 3 0 0 0 6 0" />
    </>
  ),
  basket: (
    <>
      <Path d="M3 8h18l-1.6 11.2a1 1 0 0 1-1 .8H5.6a1 1 0 0 1-1-.8z" />
      <Path d="M8.5 8 12 2.8 15.5 8" />
      <Path d="M9.5 12v4M14.5 12v4" />
    </>
  ),
  heart: <Path d="M12 20.5s-7.5-4.6-7.5-9.7A4.3 4.3 0 0 1 12 8.4a4.3 4.3 0 0 1 7.5 2.4c0 5.1-7.5 9.7-7.5 9.7z" />,
  user: (
    <>
      <Circle cx="12" cy="8" r="3.6" />
      <Path d="M4.8 20.5a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),
};

export const TabGlyph: React.FC<{ name: TabGlyphName; size?: number; color?: string }> = ({
  name,
  size = 22,
  color = '#64748B',
}) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {PATHS[name]}
  </Svg>
);
