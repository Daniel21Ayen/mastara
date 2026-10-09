// packages/ui-tokens/src/typography.ts
export const fontSize = { caption: 12, body: 14, bodyLarge: 16, heading: 20, title: 28 } as const;

/** Font family names registered by the mobile app (expo-font). */
export const fontFamily = {
  sans: { regular: 'PlusJakartaSans_500Medium', bold: 'PlusJakartaSans_700Bold' },
  ethiopic: { regular: 'NotoSansEthiopic_400Regular', bold: 'NotoSansEthiopic_700Bold' },
} as const;
