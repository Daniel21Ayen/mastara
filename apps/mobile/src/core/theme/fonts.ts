// apps/mobile/src/core/theme/fonts.ts
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_700Bold,
} from '@expo-google-fonts/noto-sans-ethiopic';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import Ionicons from '@expo/vector-icons/Ionicons';

/** Fonts are bundled with the app so text and icons render offline. Keys must match `fontFamily` tokens. */
export const fontAssets = {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_700Bold,
  ...Ionicons.font,
};
