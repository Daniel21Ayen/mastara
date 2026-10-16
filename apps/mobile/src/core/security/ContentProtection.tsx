// apps/mobile/src/core/security/ContentProtection.tsx
import { maskIdentifier } from '@mastara/domain';
import { withAlpha } from '@mastara/ui-tokens';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { createStyles } from '@/core/theme';

const ROWS = 9;
const COLUMNS = 3;

/**
 * Protects study material while a student is signed in.
 * 1. Android: blocks screenshots and screen recording and hides the app in the recent-apps preview (FLAG_SECURE).
 *    iOS: blocks screen recording and makes screenshots blank.
 * 2. A faint watermark with the student's masked phone or email covers every screen, so a photo taken with another
 *    camera (which no app can stop) can be traced back to the account.
 * Mount only while signed in.
 */
export function ContentProtection({ identifier }: { identifier: string }) {
  const styles = useStyles();
  usePreventScreenCapture('mastara-content');
  const { width, height } = useWindowDimensions();
  const label = `${maskIdentifier(identifier)} · Mastara`;

  // A tilted grid, larger than the screen so the corners are covered after rotation.
  const size = Math.max(width, height) * 1.5;

  return (
    <View pointerEvents="none" style={styles.overlay} importantForAccessibility="no-hide-descendants">
      <View style={[styles.grid, { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }]}>
        {Array.from({ length: ROWS * COLUMNS }, (_, index) => (
          <View key={index} style={[styles.cell, { width: size / COLUMNS, height: size / ROWS }]}>
            <Text style={styles.text}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  overlay: { ...StyleSheet.absoluteFill, overflow: 'hidden', elevation: 50, zIndex: 50 },
  grid: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    transform: [{ rotate: '-24deg' }],
  },
  cell: { alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 13, color: withAlpha(theme.colors.text, 0.09), fontFamily: theme.fontFamily.sans.regular },
}));
