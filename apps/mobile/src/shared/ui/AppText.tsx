import type { Language } from '@mastara/i18n';
import React, { type ReactNode } from 'react';
import { Text } from 'react-native';
import type { TextProps } from 'react-native';

import { useI18n } from '@/core/i18n';
import { theme } from '@/core/theme';

type Variant = 'title' | 'heading' | 'body' | 'bodyLarge' | 'caption';

interface AppTextProps extends TextProps {
  variant?: Variant;
  bold?: boolean;
  muted?: boolean;
  color?: string;
  /** Font follows this language instead of the app language (for bilingual content). */
  lang?: Language;
}

const sizeByVariant: Record<Variant, number> = {
  title: theme.fontSize.title,
  heading: theme.fontSize.heading,
  bodyLarge: theme.fontSize.bodyLarge,
  body: theme.fontSize.body,
  caption: theme.fontSize.caption,
};

function resolveChild(child: ReactNode, lang: Language): ReactNode {
  if (child && typeof child === 'object' && !React.isValidElement(child)) {
    if ('en' in (child as any) || 'am' in (child as any)) {
      const b = child as { en?: string; am?: string };
      return lang === 'am' ? (b.am ?? b.en ?? '') : (b.en ?? b.am ?? '');
    }
  }
  return child;
}

export function AppText({
  variant = 'body',
  bold = variant === 'title' || variant === 'heading',
  muted = false,
  color,
  lang,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { language } = useI18n();
  const effectiveLang = lang ?? language;
  const family = effectiveLang === 'am' ? theme.fontFamily.ethiopic : theme.fontFamily.sans;

  const resolvedChildren = React.Children.map(children, (child) =>
    resolveChild(child, effectiveLang),
  );

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: bold ? family.bold : family.regular,
          fontSize: sizeByVariant[variant],
          color: color ?? (muted ? theme.colors.textMuted : theme.colors.text),
        },
        style,
      ]}
    >
      {resolvedChildren}
    </Text>
  );
}
