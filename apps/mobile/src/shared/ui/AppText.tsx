// apps/mobile/src/shared/ui/AppText.tsx
import type { Language } from '@mastara/i18n';
import { Text } from 'react-native';
import type { TextProps } from 'react-native';

import { useI18n } from '@/core/i18n';
import { useTheme } from '@/core/theme';

type Variant = 'title' | 'heading' | 'body' | 'bodyLarge' | 'caption';

interface AppTextProps extends TextProps {
  variant?: Variant;
  bold?: boolean;
  muted?: boolean;
  color?: string;
  /** Font follows this language instead of the app language (for bilingual content). */
  lang?: Language;
}

export function AppText({
  variant = 'body',
  bold = variant === 'title' || variant === 'heading',
  muted = false,
  color,
  lang,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const { language } = useI18n();
  const family = (lang ?? language) === 'am' ? theme.fontFamily.ethiopic : theme.fontFamily.sans;

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: bold ? family.bold : family.regular,
          fontSize: theme.fontSize[variant],
          color: color ?? (muted ? theme.colors.textMuted : theme.colors.text),
        },
        style,
      ]}
    />
  );
}
