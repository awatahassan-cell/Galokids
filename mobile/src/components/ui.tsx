import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
} from 'react-native';
import { colors, radius, shadow, spacing, type } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * The handful of pieces every screen is built from.
 *
 * They exist mainly so that writing direction is handled once. Kurdish and
 * Arabic are read right to left, and rather than flipping the whole app with
 * `I18nManager.forceRTL` — which needs a restart to take effect, and leaves
 * the app half-flipped until then — each of these lays itself out in the
 * current direction.
 */

/** Text that aligns and flows the right way for the chosen language. */
export const T: React.FC<TextProps & { weight?: 'regular' | 'bold' | 'black'; size?: keyof typeof type; color?: string; center?: boolean }> = ({
  style,
  weight = 'regular',
  size = 'base',
  color = colors.slate[800],
  center,
  ...rest
}) => {
  const { isRTL } = useLanguage();

  return (
    <Text
      {...rest}
      style={[
        type[size],
        {
          color,
          fontWeight: weight === 'black' ? '900' : weight === 'bold' ? '700' : '500',
          textAlign: center ? 'center' : isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        } as TextStyle,
        style,
      ]}
    />
  );
};

/** A row that runs in the reading direction. */
export const Row: React.FC<ViewProps & { gap?: number; align?: 'center' | 'flex-start' | 'flex-end' | 'baseline'; justify?: 'flex-start' | 'center' | 'space-between' | 'flex-end' }> = ({
  style,
  gap = 0,
  align = 'center',
  justify = 'flex-start',
  ...rest
}) => {
  const { isRTL } = useLanguage();

  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
        },
        style,
      ]}
    />
  );
};

export const Card: React.FC<ViewProps> = ({ style, ...rest }) => (
  <View
    {...rest}
    style={[
      {
        backgroundColor: colors.surface,
        borderRadius: radius['2xl'],
        borderWidth: 1,
        borderColor: colors.border,
      },
      shadow.sm,
      style,
    ]}
  />
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const Button: React.FC<
  Omit<PressableProps, 'children'> & {
    title: string;
    variant?: ButtonVariant;
    loading?: boolean;
    icon?: React.ReactNode;
    full?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
> = ({ title, variant = 'primary', loading, icon, full, size = 'md', disabled, style, ...rest }) => {
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.candy[500], fg: colors.white, border: 'transparent' },
    secondary: { bg: colors.candy[50], fg: colors.candy[700], border: colors.candy[100] },
    ghost: { bg: 'transparent', fg: colors.slate[700], border: colors.slate[200] },
    danger: { bg: colors.rose[600], fg: colors.white, border: 'transparent' },
  };

  const height = size === 'lg' ? 54 : size === 'sm' ? 38 : 48;
  const chosen = palette[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      // A control smaller than this is hard to hit accurately with a thumb.
      hitSlop={size === 'sm' ? 6 : 0}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === 'sm' ? spacing.lg : spacing['2xl'],
          borderRadius: radius.pill,
          backgroundColor: chosen.bg,
          borderWidth: 1,
          borderColor: chosen.border,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        variant === 'primary' && !isDisabled ? shadow.candy : null,
        style as object,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={chosen.fg} />
      ) : (
        <Row gap={spacing.sm}>
          {icon}
          <T weight="black" size={size === 'sm' ? 'sm' : 'base'} color={chosen.fg}>
            {title}
          </T>
        </Row>
      )}
    </Pressable>
  );
};

/** The small tinted label the website uses for badges and chips. */
export const Pill: React.FC<{ label: string; tone?: 'candy' | 'mint' | 'sunny' | 'slate' | 'rose'; }> = ({
  label,
  tone = 'candy',
}) => {
  const tones = {
    candy: { bg: colors.candy[50], fg: colors.candy[700], border: colors.candy[200] },
    mint: { bg: colors.mint[50], fg: colors.mint[700], border: colors.mint[100] },
    sunny: { bg: colors.sunny[100], fg: colors.sunny[700], border: colors.sunny[200] },
    slate: { bg: colors.slate[100], fg: colors.slate[600], border: colors.slate[200] },
    rose: { bg: colors.rose[50], fg: colors.rose[700], border: colors.rose[200] },
  }[tone];

  return (
    <View
      style={{
        backgroundColor: tones.bg,
        borderColor: tones.border,
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <T size="xs" weight="black" color={tones.fg}>
        {label}
      </T>
    </View>
  );
};

export const Divider: React.FC<{ spacingY?: number }> = ({ spacingY = spacing.lg }) => (
  <View style={{ height: 1, backgroundColor: colors.slate[100], marginVertical: spacingY }} />
);

/** Shown while a screen's first load is in flight. */
export const Loading: React.FC<{ label?: string }> = ({ label }) => (
  <View style={styles.centered}>
    <ActivityIndicator color={colors.candy[500]} size="large" />
    {label ? (
      <T size="sm" weight="bold" color={colors.slate[400]} center style={{ marginTop: spacing.md }}>
        {label}
      </T>
    ) : null}
  </View>
);

/** Shown when there is nothing to show, or when the network failed. */
export const EmptyState: React.FC<{
  emoji?: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ emoji = '🧸', title, hint, action }) => (
  <View style={styles.centered}>
    <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>{emoji}</Text>
    <T size="lg" weight="black" center color={colors.slate[800]}>
      {title}
    </T>
    {hint ? (
      <T size="sm" weight="bold" center color={colors.slate[400]} style={{ marginTop: spacing.sm, maxWidth: 280 }}>
        {hint}
      </T>
    ) : null}
    {action ? <View style={{ marginTop: spacing.xl }}>{action}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
});
