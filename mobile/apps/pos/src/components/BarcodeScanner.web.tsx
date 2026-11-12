import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The scanner, in a browser.
 *
 * Deliberately not the camera. `expo-camera` reads barcodes on the web by
 * fetching jsQR from a CDN at runtime — so a till on a shop's wifi needs the
 * public internet to scan a price tag, which is the one thing this app
 * promises it does not need. The sandbox this was built in blocks that host,
 * and the failure was exactly what a shop behind a strict network would see.
 *
 * A web till is a computer on a counter, and the thing on that counter is a
 * USB barcode scanner. Those type the code and press Enter, so a focused input
 * reads them with no driver, no permission prompt and no camera — and the same
 * box lets the cashier type a code when a label is torn.
 *
 * The native build keeps the camera; see `BarcodeScanner.tsx`.
 */

/** A scanner types far faster than a person; anything slower is a human. */
const SCANNER_SPEED_MS = 60;

export function BarcodeScanner({
  onScan,
  paused = false,
}: {
  onScan: (code: string) => void;
  paused?: boolean;
}) {
  const [value, setValue] = useState('');
  const [lastScan, setLastScan] = useState<string | null>(null);

  const input = useRef<TextInput>(null);
  const lastKeyAt = useRef(0);
  const wasTyped = useRef(false);

  // Keep the focus. A cashier scans one garment after another without
  // touching the screen, and a lost focus means the next scan goes nowhere.
  useEffect(() => {
    if (!paused) {
      const timer = setTimeout(() => input.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [paused, lastScan]);

  const submit = (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setValue('');
    setLastScan(clean);
    wasTyped.current = false;
    onScan(clean);
  };

  return (
    <View style={styles.frame}>
      <Text style={styles.title}>سکێنەری بارکۆد</Text>
      <Text style={styles.hint}>
        بارکۆدەکە سکێن بکە، یان بە دەست بینووسە و Enter دابگرە.
      </Text>

      <TextInput
        ref={input}
        style={styles.input}
        value={value}
        editable={!paused}
        autoFocus
        // A scanner sends the whole code then Enter; onSubmitEditing is the
        // Enter. Characters arriving slowly mean somebody is typing.
        onChangeText={next => {
          const now = Date.now();
          if (now - lastKeyAt.current > SCANNER_SPEED_MS) wasTyped.current = true;
          lastKeyAt.current = now;
          setValue(next);
        }}
        onSubmitEditing={() => submit(value)}
        onBlur={() => {
          if (!paused) setTimeout(() => input.current?.focus(), 80);
        }}
        placeholder="GALO000001"
        placeholderTextColor={colors.textFaint}
        textAlign="center"
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.go, !value.trim() && styles.goDisabled]}
          onPress={() => submit(value)}
          disabled={!value.trim()}
        >
          <Text style={styles.goText}>زیادکردن</Text>
        </Pressable>

        <Text style={styles.last} numberOfLines={1}>
          {lastScan ? `دوایین: ${lastScan}` : 'هێشتا هیچ سکێن نەکراوە'}
        </Text>
      </View>

      {paused && (
        <View style={styles.veil} pointerEvents="none">
          <Text style={styles.veilText}>وەستاوە</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text, textAlign: 'right' },
  hint: { ...typography.tiny, color: colors.textMuted, textAlign: 'right' },
  input: {
    minHeight: TOUCH_TARGET + 10,
    borderWidth: 2,
    borderColor: colors.brand,
    borderRadius: radius.md,
    ...typography.title,
    color: colors.text,
    ...typography.mono,
  },
  footer: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  go: {
    minHeight: TOUCH_TARGET - 8,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  goDisabled: { opacity: 0.35 },
  goText: { color: '#fff', ...typography.small },
  last: { flex: 1, ...typography.tiny, color: colors.textFaint, textAlign: 'left' },
  veil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,250,252,0.85)',
    borderRadius: radius.lg,
  },
  veilText: { ...typography.heading, color: colors.textMuted },
});
