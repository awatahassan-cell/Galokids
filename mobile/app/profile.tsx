import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../src/theme';
import { useLanguage } from '../src/i18n/LanguageProvider';
import { useAuth } from '../src/store/AuthProvider';
import { formatPhone } from '../src/utils/phone';
import { Field } from '../src/components/Field';
import { Button, Card, EmptyState, Row, T } from '../src/components/ui';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const { user, isSignedIn, loading, updateMe } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setAddress(user.address ?? '');
  }, [user]);

  const onSave = useCallback(async () => {
    setMessage(null);
    setSaving(true);
    try {
      await updateMe({ name: name.trim(), email: email.trim() || undefined, address: address.trim() });
      setMessage(t('saved'));
    } catch (error) {
      setMessage((error as Error).message || t('somethingWrong'));
    } finally {
      setSaving(false);
    }
  }, [name, email, address, updateMe, t]);

  if (!loading && !isSignedIn) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <EmptyState
          emoji="🔐"
          title={t('signInToContinue')}
          action={<Button title={t('signIn')} onPress={() => router.replace('/auth/sign-in?next=/profile' as never)} />}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <Row gap={spacing.md}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <T size="lg" weight="black" color={colors.slate[700]}>{isRTL ? '→' : '←'}</T>
          </Pressable>
          <T size="xl" weight="black">{t('profile')}</T>
        </Row>

        {/* The phone number is shown but not editable: it is the account's
            identity, and changing it would need a fresh code sent to the new
            number to prove it. */}
        <Card style={{ padding: spacing.lg, gap: 4 }}>
          <T size="xs" weight="black" color={colors.slate[500]}>{t('phone')}</T>
          <T size="base" weight="black">{user?.phone ? formatPhone(user.phone) : '—'}</T>
        </Card>

        <Field label={t('fullName')} value={name} onChangeText={setName} autoComplete="name" />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field label={t('addressDetail')} value={address} onChangeText={setAddress} multiline />

        {message ? (
          <T size="sm" weight="bold" color={message === t('saved') ? colors.mint[700] : colors.rose[600]}>
            {message}
          </T>
        ) : null}

        <Button full size="lg" title={t('saveChanges')} loading={saving} onPress={onSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
