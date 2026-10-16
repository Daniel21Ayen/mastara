// apps/admin-web/src/app/layout.tsx
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ThemeStyle } from '@/core/theme';

export const metadata: Metadata = {
  title: { default: 'Mastara Admin', template: '%s · Mastara Admin' },
  description: 'Mastara admin portal',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeStyle />
      </head>
      <body>{children}</body>
    </html>
  );
}
