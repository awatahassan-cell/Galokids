import { Text, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/kit';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Not built here yet, and saying so.
 *
 * Printing a sticker needs a printer the app has to be paired with, which is a
 * development build and a driver rather than a screen. An empty page that
 * looked finished would be worse than this.
 */
export default function LabelsScreen() {
  return (
    <Screen title="لەیبل و بارکۆد" subtitle="چاپکردنی ستیکەر">
      <View style={styles.panel}>
        <Text style={styles.title}>هێشتا لە ئەپەکەدا نییە</Text>
        <Text style={styles.body}>
          چاپکردنی ستیکەر پێویستی بە پەیوەندیکردن بە پرینتەرەوە هەیە، کە پێویستی بە
          وەشانێکی تایبەتی ئەپەکە دەبێت.{'\n\n'}
          لە ئێستادا لە پەنێلی وێبەوە چاپ بکە — بارکۆدەکان هەمان بارکۆدن.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  title: { ...typography.heading, color: colors.text, textAlign: 'right' },
  body: { ...typography.small, color: colors.textMuted, textAlign: 'right', lineHeight: 22 },
});
