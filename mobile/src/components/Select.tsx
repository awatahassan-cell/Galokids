import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Option } from '../utils/locations';
import { Row, T } from './ui';

/**
 * A picker, as a sheet rather than a platform dropdown.
 *
 * The native pickers differ so much between iOS and Android that using them
 * would give the checkout two different looks; a sheet is one look, reads
 * correctly right-to-left, and copes with the nineteen governorates and the
 * long district lists behind them without needing a scroll wheel.
 */
export const Select: React.FC<{
  label: string;
  placeholder: string;
  value?: string;
  options: Option[];
  onChange: (value: string, label: string) => void;
  disabled?: boolean;
  error?: boolean;
}> = ({ label, placeholder, value, options, onChange, disabled, error }) => {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { isRTL, t } = useLanguage();

  const current = options.find(option => option.value === value);

  return (
    <View style={{ gap: 6 }}>
      <T size="xs" weight="black" color={colors.slate[500]}>
        {label}
      </T>

      <Pressable
        onPress={() => !disabled && options.length > 0 && setOpen(true)}
        style={{
          height: 50,
          borderRadius: radius.xl,
          backgroundColor: disabled ? colors.slate[50] : colors.surface,
          borderWidth: 1,
          borderColor: error ? colors.rose[200] : colors.slate[200],
          paddingHorizontal: spacing.lg,
          justifyContent: 'center',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Row justify="space-between">
          <T
            size="sm"
            weight="bold"
            color={current ? colors.slate[800] : colors.slate[400]}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {current?.label ?? placeholder}
          </T>
          <T size="xs" color={colors.slate[400]}>
            ▾
          </T>
        </Row>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' }}
        />

        <View
          style={{
            maxHeight: '70%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius['3xl'],
            borderTopRightRadius: radius['3xl'],
            paddingTop: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
          }}
        >
          <Row
            justify="space-between"
            style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}
          >
            <T size="lg" weight="black">
              {label}
            </T>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <T size="sm" weight="black" color={colors.candy[700]}>
                {t('close')}
              </T>
            </Pressable>
          </Row>

          <FlatList
            data={options}
            keyExtractor={option => option.value}
            initialNumToRender={16}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value, item.label);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: spacing.xl,
                    paddingVertical: spacing.lg,
                    backgroundColor: active ? colors.candy[50] : 'transparent',
                  }}
                >
                  <Row justify="space-between">
                    <T
                      size="sm"
                      weight={active ? 'black' : 'bold'}
                      color={active ? colors.candy[700] : colors.slate[700]}
                      style={{ flex: 1, textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {item.label}
                    </T>
                    {active ? (
                      <T size="sm" color={colors.candy[600]}>
                        ✓
                      </T>
                    ) : null}
                  </Row>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};
