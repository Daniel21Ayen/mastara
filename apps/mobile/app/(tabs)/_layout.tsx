// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

import { useI18n } from '@/core/i18n';
import { STUDENT_TABS } from '@/core/navigation';
import { theme } from '@/core/theme';
import { Icon } from '@/shared/ui';

export default function TabsLayout() {
  const { t, language } = useI18n();
  const family = language === 'am' ? theme.fontFamily.ethiopic : theme.fontFamily.sans;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontFamily: family.bold, fontSize: theme.fontSize.caption },
      }}
    >
      {STUDENT_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
