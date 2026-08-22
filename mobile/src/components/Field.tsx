import React from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import { T } from './ui';

/** A labelled text input that lays itself out in the reading direction. */
export const Field: React.FC<
  TextInputProps & { label: string; error?: string | null; multiline?: boolean }
> = ({ label, error, multiline, style, ...rest }) => {
  const { isRTL } = useLanguage();

  return (
    <View style={{ gap: 6 }}>
      <T size="xs" weight="black" color={colors.slate[500]}>
        {label}
      </T>

      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.slate[400]}
        style={[
          {
            minHeight: multiline ? 92 : 50,
            borderRadius: radius.xl,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: error ? colors.rose[200] : colors.slate[200],
            paddingHorizontal: spacing.lg,
            paddingVertical: multiline ? spacing.md : 0,
            fontSize: 14,
            fontWeight: '700',
            color: colors.slate[800],
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
      />

      {error ? (
        <T size="xs" weight="bold" color={colors.rose[600]}>
          {error}
        </T>
      ) : null}
    </View>
  );
};
