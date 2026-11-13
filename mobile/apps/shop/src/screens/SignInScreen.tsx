import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TextInput as RNTextInput } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { displayPhone, isValidPhone } from '@galokids/core';
import { PageWash, PrimaryButton, TabBar } from '@/components/ui';
import { useAccount } from '@/state/useAccount';
import { colors, fonts, radius, shadow, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Signing in with a code sent to the phone.
 *
 * No password, which is deliberate: this shop's customers order over Instagram
 * and WhatsApp, and a password is one more thing to forget between one order
 * and the next. The number they already give the shop is the account.
 *
 * Two steps, and the second one is not optional. The code is checked by the
 * server, which hands back a short-lived token, and only that token opens a
 * session — so possession of a phone number proves nothing on its own.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { user, requestCode, confirmCode } = useAccount();

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // A code lasts a few minutes. Counting down stops a shopper waiting for a
  // second message that the server will refuse to send yet.
  const [resendIn, setResendIn] = useState(0);
  const codeField = useRef<RNTextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;

    const timer = setInterval(() => setResendIn(seconds => Math.max(0, seconds - 1)), 1000);

    return () => clearInterval(timer);
  }, [resendIn]);

  // Already signed in — or just finished. Go where they were headed.
  useEffect(() => {
    if (!user) return;

    const target = typeof next === 'string' && next.startsWith('/') ? next : '/account';
    router.replace(target as never);
  }, [user, next, router]);

  const send = async () => {
    if (busy) return;

    if (!isValidPhone(phone)) {
      setProblem('ژمارەی مۆبایلەکە دروست نییە. وەک 0750 123 4567 بنووسە.');
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      await requestCode(phone);

      setStep('code');
      setResendIn(60);
      setTimeout(() => codeField.current?.focus(), 150);
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy) return;

    if (code.trim().length < 4) {
      setProblem('کۆدەکە تەواو نییە.');
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      await confirmCode(phone, code.trim(), name.trim() || undefined);
      // The effect above sees the user appear and moves on, so there is
      // nothing to navigate to here.
    } catch (error) {
      setProblem((error as Error).message);
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <PageWash />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.markRing}>
              <Text style={styles.mark}>🎈</Text>
            </View>

            <Text style={styles.title}>چوونەژوورەوە</Text>

            {step === 'phone' ? (
              <>
                <Text style={styles.lead}>
                  ژمارەی مۆبایلەکەت بنووسە. کۆدێکی چوار ژمارەیی بۆت دەنێرین.
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="0750 123 4567"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  value={phone}
                  onChangeText={text => {
                    setPhone(text);
                    setProblem(null);
                  }}
                  onSubmitEditing={send}
                  textAlign="center"
                />

                {problem && <Text style={styles.problem}>{problem}</Text>}

                <PrimaryButton
                  label="ناردنی کۆد"
                  onPress={send}
                  busy={busy}
                  // Named for a screen reader, and so the button is reachable
                  // by name — the page title is the same two words.
                />

                <Pressable style={styles.quiet} onPress={() => router.replace('/')}>
                  <Text style={styles.quietText}>بەبێ هەژمار بگەڕێ</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.lead}>کۆدەکە بۆ {displayPhone(phone)} نێردرا.</Text>

                <TextInput
                  ref={codeField}
                  style={[styles.input, styles.codeInput]}
                  placeholder="— — — —"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  // So the phone's own "paste the code from your messages"
                  // suggestion appears instead of the shopper switching apps.
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  value={code}
                  onChangeText={text => {
                    setCode(text.replace(/\D/g, ''));
                    setProblem(null);
                  }}
                  onSubmitEditing={confirm}
                  textAlign="center"
                />

                <TextInput
                  style={styles.input}
                  placeholder="ناوت (ئارەزوومەندانە)"
                  placeholderTextColor={colors.textFaint}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                />

                {problem && <Text style={styles.problem}>{problem}</Text>}

                <PrimaryButton label="پشتڕاستکردنەوە" onPress={confirm} busy={busy} />

                <Pressable
                  style={styles.quiet}
                  onPress={() => (resendIn > 0 ? undefined : send())}
                  disabled={resendIn > 0 || busy}
                >
                  <Text style={[styles.quietText, resendIn > 0 && styles.quietOff]}>
                    {resendIn > 0 ? `ناردنەوەی کۆد لە ${resendIn} چرکە` : 'کۆدەکە بنێرەوە'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.quiet}
                  onPress={() => {
                    setStep('phone');
                    setCode('');
                    setProblem(null);
                  }}
                >
                  <Text style={styles.quietText}>گۆڕینی ژمارە</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'stretch',
    ...shadow.raised,
  },
  markRing: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.brandLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { fontSize: 34, lineHeight: 42 },
  title: { ...typography.display, color: colors.text, textAlign: 'center' },
  lead: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.text,
  },
  codeInput: { fontSize: 24, fontFamily: fonts.bold, letterSpacing: 8, lineHeight: 34 },
  problem: { ...typography.small, color: colors.danger, textAlign: 'center' },
  quiet: { alignItems: 'center', paddingVertical: spacing.sm, minHeight: 36 },
  quietText: { ...typography.small, color: colors.brandText },
  quietOff: { color: colors.textFaint },
});
