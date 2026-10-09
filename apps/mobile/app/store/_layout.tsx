// apps/mobile/app/store/_layout.tsx
import { Stack } from 'expo-router';

import { theme } from '@/core/theme';
import { OrderDraftProvider } from '@/modules/store';

/** The draft order lives here, so it is shared by the Store screens and dropped when the student leaves the Store. */
export default function StoreLayout() {
  return (
    <OrderDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.surface } }} />
    </OrderDraftProvider>
  );
}
