// apps/mobile/src/shared/ui/BottomSheet.tsx
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { theme } from '@/core/theme';

import { AppText } from './AppText';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wrap children in a ScrollView. Leave off when children scroll on their own (for example a FlatList). */
  scroll?: boolean;
}

export function BottomSheet({ visible, title, onClose, children, scroll = false }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <AppText variant="heading" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {scroll ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  sheet: {
    maxHeight: '85%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  title: { paddingBottom: theme.spacing.md },
  content: { gap: theme.spacing.md, paddingBottom: theme.spacing.lg },
});
