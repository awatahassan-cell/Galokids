import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSession } from '@/state/useSession';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * Signing the till in.
 *
 * Done once when the shop sets the device up, and rarely again — the token is
 * kept in secure storage and is not thrown away because a request failed. So
 * this screen is for the rare case, and its job is to be clear about why it is
 * refusing rather than to be quick.
 */
export default function SignInScreen() {
  const { signIn } = useSession();

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    if (!login.trim() || !password || busy) return;

    setBusy(true);
    setProblem(null);

    try {
      await signIn(login.trim(), password);
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.title}>سیستەمی فرۆشتن</Text>
        <Text style={styles.subtitle}>گەلۆ کیدز</Text>

        <TextInput
          style={styles.input}
          placeholder="ئیمەیڵ یان ژمارەی مۆبایل"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={login}
          onChangeText={setLogin}
          textAlign="right"
        />

        <TextInput
          style={styles.input}
          placeholder="تێپەڕەوشە"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          textAlign="right"
        />

        {problem && <Text style={styles.problem}>{problem}</Text>}

        <Pressable
          style={[styles.submit, (!login.trim() || !password) && styles.submitDisabled]}
          onPress={submit}
          disabled={busy || !login.trim() || !password}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>چوونەژوورەوە</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...typography.display, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.small, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  problem: { ...typography.small, color: colors.danger, textAlign: 'right' },
  submit: {
    minHeight: TOUCH_TARGET + 4,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', ...typography.title },
});
