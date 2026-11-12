import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { displayPhone, isValidPhone } from '@galokids/core';
import { useAccount } from '@/state/useAccount';
import { TabBar } from '@/components/ui';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

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
  const codeField = useRef<TextInput>(null);

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
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.mark}>🎈</Text>
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

              <Pressable
                style={[styles.go, busy && styles.goBusy]}
                onPress={send}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="ناردنی کۆدی چوونەژوورەوە"
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.goText}>ناردنی کۆد</Text>
                )}
              </Pressable>

              <Pressable style={styles.skip} onPress={() => router.replace('/')}>
                <Text style={styles.skipText}>بەبێ هەژمار بگەڕێ</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.lead}>
                کۆدەکە بۆ {displayPhone(phone)} نێردرا.
              </Text>

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

              <Pressable
                style={[styles.go, busy && styles.goBusy]}
                onPress={confirm}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="پشتڕاستکردنەوەی کۆد و چوونەژوورەوە"
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.goText}>چوونەژوورەوە</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.skip}
                onPress={() => (resendIn > 0 ? undefined : send())}
                disabled={resendIn > 0 || busy}
              >
                <Text style={[styles.skipText, resendIn > 0 && styles.skipTextOff]}>
                  {resendIn > 0 ? `ناردنەوەی کۆد لە ${resendIn} چرکە` : 'کۆدەکە بنێرەوە'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.skip}
                onPress={() => {
                  setStep('phone');
                  setCode('');
                  setProblem(null);
                }}
              >
                <Text style={styles.skipText}>گۆڕینی ژمارە</Text>
              </Pressable>
            </>
          )}
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
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  mark: { fontSize: 48, textAlign: 'center' },
  title: { ...typography.display, color: colors.text, textAlign: 'center' },
  lead: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: TOUCH_TARGET + 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    color: colors.text,
  },
  codeInput: { fontSize: 26, fontWeight: '800', letterSpacing: 8 },
  problem: { ...typography.small, color: colors.danger, textAlign: 'center' },
  go: {
    minHeight: TOUCH_TARGET + 6,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goBusy: { opacity: 0.7 },
  goText: { color: '#fff', ...typography.title },
  skip: { alignItems: 'center', paddingVertical: spacing.sm, minHeight: TOUCH_TARGET - 12 },
  skipText: { ...typography.small, color: colors.brand },
  skipTextOff: { color: colors.textFaint },
});
