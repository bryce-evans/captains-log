import {
  useFonts,
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

/**
 * Loads Fraunces + Inter at app boot. The design uses Fraunces for any value
 * the user will remember (display) and Inter for chrome (body). On iOS the
 * Fraunces SOFT axis (80) is applied via fontVariationSettings on each preset
 * component; on Android variable-axis support is uneven so we fall back to
 * the standard family. Note: @expo-google-fonts ships static weights here,
 * not the variable file — the SOFT axis is requested where the OS supports it.
 */
export function useAppFonts(): { fontsLoaded: boolean } {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  return { fontsLoaded };
}
