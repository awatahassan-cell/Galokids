import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/i18n/LanguageProvider';
import { useAuth } from '../../src/store/AuthProvider';
import { useShop } from '../../src/store/ShopProvider';
import { phoneStatus } from '../../src/api/endpoints';
import { formatPhone, isValidPhone, normalizePhone } from '../../src/utils/phone';
import { Field } from '../../src/components/Field';
import { Button, Row, T } from '../../src/components/ui';

const RESEND_SECONDS = 60;

/**
 * Signing in, by phone number and a one-time code.
 *
 * Three steps: the number, the code, and — only for someone the shop has
 * never seen — a name. There is no password anywhere in the flow, so there is
 * no password for the app to store, and none for a customer to reuse.
 *
 * The code field is a single input rather than six boxes: six boxes look
 * neat and fight every Android keyboard, autofill and paste.
 */
export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { t, isRTL } = useLanguage();
  const { sendCode, confirmCode } = useAuth();
  const { settings } = useShop();

  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const goBackOrNext = useCallback(() => {
    const target = typeof next === 'string' && next.startsWith('/') ? next : null;
    if (target) router.replace(target as never);
    else if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }, [next, router]);

  const onSendCode = useCallback(async () => {
    setError(null);

    if (!isValidPhone(phone)) {
      setError(t('invalidPhone'));
      return;
    }

    setBusy(true);
    try {
      // Ask whether the shop already knows this number, so a returning
      // customer is never asked for their name again.
      const status = await phoneStatus(phone);
      setIsNewCustomer(!status.exists);
      if (status.name) setName(status.name);

      await sendCode(phone);
      setStep('code');
      setSecondsLeft(RESEND_SECONDS);
      setTimeout(() => codeInput.current?.focus(), 300);
    } catch (caught) {
      setError((caught as Error).message || t('somethingWrong'));
    } finally {
      setBusy(false);
    }
  }, [phone, sendCode, t]);

  const onVerify = useCallback(async () => {
    setError(null);

    const digits = code.replace(/\D/g, '');
    if (digits.length < 4) {
      setError(t('required'));
      return;
    }

    // A brand-new customer needs a name before the account can be made, and
    // asking for it after the code keeps the first screen to one field.
    if (isNewCustomer && !name.trim()) {
      setStep('name');
      return;
    }

    setBusy(true);
    try {
      await confirmCode(phone, digits, isNewCustomer ? name.trim() : undefined);
      goBackOrNext();
    } catch (caught) {
      setError((caught as Error).message || t('somethingWrong'));
    } finally {
      setBusy(false);
    }
  }, [code, isNewCustomer, name, phone, confirmCode, goBackOrNext, t]);

  const onResend = useCallback(async () => {
    if (secondsLeft > 0) return;
    setError(null);
    setBusy(true);
    try {
      await sendCode(phone);
      setSecondsLeft(RESEND_SECONDS);
    } catch (caught) {
      setError((caught as Error).message || t('somethingWrong'));
    } finally {
      setBusy(false);
    }
  }, [secondsLeft, phone, sendCode, t]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Row style={{ paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <T size="lg" weight="black" color={colors.slate[700]}>
            {isRTL ? '→' : '←'}
          </T>
        </Pressable>
      </Row>

      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <T size="2xl" weight="black" center>
            {settings.storeName || 'Galo Kids'}
          </T>
          <T size="sm" weight="bold" color={colors.slate[500]} center>
            {step === 'phone'
              ? t('signInHint')
              : step === 'code'
                ? t('codeSentTo', { phone: formatPhone(phone) })
                : t('yourNameHint')}
          </T>
        </View>

        {step === 'phone' ? (
          <View style={{ gap: spacing.lg }}>
            <Field
              label={t('phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0770 000 0000"
              autoComplete="tel"
              autoFocus
              error={error}
            />
            <Button full size="lg" title={t('sendCode')} loading={busy} onPress={onSendCode} />
          </View>
        ) : null}

        {step === 'code' ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: 6 }}>
              <T size="xs" weight="black" color={colors.slate[500]}>
                {t('enterCode')}
              </T>
              <TextInput
                ref={codeInput}
                value={code}
                onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                // Lets both platforms offer the code straight from the SMS.
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                style={{
                  height: 62,
                  borderRadius: radius.xl,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: error ? colors.rose[200] : colors.slate[200],
                  textAlign: 'center',
                  fontSize: 26,
                  fontWeight: '900',
                  letterSpacing: 10,
                  color: colors.slate[800],
                }}
              />
              {error ? (
                <T size="xs" weight="bold" color={colors.rose[600]}>
                  {error}
                </T>
              ) : null}
            </View>

            <Button full size="lg" title={t('verify')} loading={busy} onPress={onVerify} />

            <Row justify="space-between">
              <Pressable onPress={() => { setStep('phone'); setCode(''); setError(null); }} hitSlop={8}>
                <T size="xs" weight="black" color={colors.slate[500]}>
                  {t('changeNumber')}
                </T>
              </Pressable>

              <Pressable onPress={onResend} disabled={secondsLeft > 0} hitSlop={8}>
                <T
                  size="xs"
                  weight="black"
                  color={secondsLeft > 0 ? colors.slate[400] : colors.candy[700]}
                >
                  {secondsLeft > 0 ? t('resendIn', { n: secondsLeft }) : t('resendCode')}
                </T>
              </Pressable>
            </Row>
          </View>
        ) : null}

        {step === 'name' ? (
          <View style={{ gap: spacing.lg }}>
            <Field
              label={t('yourName')}
              value={name}
              onChangeText={setName}
              autoFocus
              autoComplete="name"
              error={error}
            />
            <Button
              full
              size="lg"
              title={t('finish')}
              loading={busy}
              disabled={!name.trim()}
              onPress={onVerify}
            />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
