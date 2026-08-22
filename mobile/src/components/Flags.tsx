import React from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

/**
 * The three flags, ported from the website's own.
 *
 * Not emoji. The Kurdistan flag has no emoji — the closest is the Iraqi one,
 * which is also Arabic's, so a language picker drawn with emoji showed the
 * same picture twice and asked the reader to tell two identical flags apart.
 * Drawn, they are distinct at any size and match the website exactly.
 *
 * Round, with a hairline border, the way the site frames them.
 */

interface FlagProps {
  size?: number;
}

const Frame: React.FC<{ size: number; viewBox: string; children: React.ReactNode; label: string }> = ({
  size,
  viewBox,
  children,
  label,
}) => (
  <Svg
    width={size}
    height={size}
    viewBox={viewBox}
    accessibilityLabel={label}
    // A circular crop, so a wide flag reads as a badge rather than a stripe.
    style={{ borderRadius: size / 2, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(203,213,225,0.8)' }}
    preserveAspectRatio="xMidYMid slice"
  >
    {children}
  </Svg>
);

export const KurdistanFlag: React.FC<FlagProps> = ({ size = 24 }) => (
  <Frame size={size} viewBox="0 0 600 400" label="Kurdistan">
    <Rect width="600" height="133.33" fill="#E41E26" />
    <Rect y="133.33" width="600" height="133.33" fill="#FFFFFF" />
    <Rect y="266.66" width="600" height="133.34" fill="#1E9B4B" />
    <Circle cx="300" cy="200" r="52" fill="#FECE00" />
  </Frame>
);

export const IraqFlag: React.FC<FlagProps> = ({ size = 24 }) => (
  <Frame size={size} viewBox="0 0 900 600" label="Iraq">
    <Rect width="900" height="200" fill="#CE1126" />
    <Rect y="200" width="900" height="200" fill="#FFFFFF" />
    <Rect y="400" width="900" height="200" fill="#000000" />
    <SvgText
      x="450"
      y="330"
      fill="#007A3D"
      fontSize="86"
      fontWeight="bold"
      textAnchor="middle"
    >
      الله أكبر
    </SvgText>
  </Frame>
);

export const UsaFlag: React.FC<FlagProps> = ({ size = 24 }) => (
  <Frame size={size} viewBox="0 0 741 390" label="United States">
    <Rect width="741" height="390" fill="#B22234" />
    <Path
      d="M0,30H741M0,90H741M0,150H741M0,210H741M0,270H741M0,330H741"
      stroke="#FFFFFF"
      strokeWidth={30}
    />
    <Rect width="296.4" height="210" fill="#3C3B6E" />
    <Circle cx="148" cy="105" r="52" fill="#FFFFFF" opacity={0.85} />
  </Frame>
);

/** Which flag stands for which language. */
export const FLAG_FOR = {
  ku: KurdistanFlag,
  ar: IraqFlag,
  en: UsaFlag,
} as const;
