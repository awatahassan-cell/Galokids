import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radius, spacing, TOUCH_TARGET, typography } from '@/theme';

/**
 * The scanner.
 *
 * Two things make this usable at a counter rather than merely working.
 *
 * It refuses to read the same code twice within a moment. A barcode sits under
 * the lens for several frames and the camera reports every one of them, so
 * without this a single scan adds four of the garment and the cashier has to
 * notice and undo it.
 *
 * And it keeps scanning. The cashier's hands are on the next item, not on the
 * screen, so there is no "scan again" button to find between garments.
 */

/** Long enough to cover one garment under the lens, short enough to rescan. */
const SAME_CODE_COOLDOWN_MS = 1200;

export function BarcodeScanner({
  onScan,
  paused = false,
}: {
  onScan: (code: string) => void;
  paused?: boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastCode = useRef<{ value: string; at: number } | null>(null);

  if (!permission) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>کامێرا پێویستە</Text>
        <Text style={styles.placeholderBody}>
          بۆ سکێنکردنی بارکۆدی بەرهەمەکان، ڕێگە بدە بە بەکارهێنانی کامێرا.
        </Text>

        <Pressable style={styles.grant} onPress={requestPermission}>
          <Text style={styles.grantText}>ڕێگەدان</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          // What a clothes shop's labels actually carry. CODE128 is what the
          // panel's own sticker printer renders, including the GALO codes.
          barcodeTypes: ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
        onBarcodeScanned={
          paused
            ? undefined
            : ({ data }) => {
                const code = String(data ?? '').trim();
                if (!code) return;

                const now = Date.now();
                const previous = lastCode.current;

                // The same label still under the lens, not a second garment.
                if (previous && previous.value === code && now - previous.at < SAME_CODE_COOLDOWN_MS) {
                  return;
                }

                lastCode.current = { value: code, at: now };
                onScan(code);
              }
        }
      />

      <View style={styles.reticle} pointerEvents="none" />

      {paused && (
        <View style={styles.pausedVeil} pointerEvents="none">
          <Text style={styles.pausedText}>وەستاوە</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  reticle: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '28%',
    bottom: '28%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.md,
  },
  pausedVeil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  pausedText: { color: '#fff', ...typography.heading },
  placeholder: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  placeholderTitle: { ...typography.heading, color: colors.text },
  placeholderBody: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
  grant: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    marginTop: spacing.sm,
  },
  grantText: { color: '#fff', ...typography.heading },
});
