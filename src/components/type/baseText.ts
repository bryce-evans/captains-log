import { Platform, type TextStyle } from 'react-native';

import { color, type } from '@/styles/tokens';

/**
 * Shared foundation for typography preset components.
 *
 * Fraunces SOFT axis (80) is applied through fontVariationSettings on iOS
 * where the platform supports OpenType variable axes. Android React Native
 * does not honor fontVariationSettings on TextStyle yet; we intentionally
 * skip it there and accept the default Fraunces weight.
 */

export type DisplayWeight = 'regular' | 'medium' | 'semibold';
export type BodyWeight = 'regular' | 'medium' | 'semibold';

const DISPLAY_FAMILY: Record<DisplayWeight, string> = {
  regular: 'Fraunces_400Regular',
  medium: 'Fraunces_500Medium',
  semibold: 'Fraunces_600SemiBold',
};

const BODY_FAMILY: Record<BodyWeight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

// `fontVariationSettings` is honored by RN on iOS but is not in the public
// `TextStyle` typings (yet). We attach it as an extra style property and
// cast through `unknown` so the platform receives it without a type lie.
const FRAUNCES_SOFT_VARIATION: TextStyle | undefined =
  Platform.OS === 'ios'
    ? ({ fontVariationSettings: `'SOFT' ${type.display.soft}` } as unknown as TextStyle)
    : undefined;

interface DisplayStyleArgs {
  size: number;
  lineHeight: number;
  letterSpacing: number;
  weight?: DisplayWeight;
}

interface BodyStyleArgs {
  size: number;
  lineHeight: number;
  letterSpacing: number;
  weight?: BodyWeight;
  uppercase?: boolean;
  tabularNumerals?: boolean;
}

export function displayStyle(args: DisplayStyleArgs): TextStyle {
  const weight: DisplayWeight = args.weight ?? 'regular';
  return {
    fontFamily: DISPLAY_FAMILY[weight],
    fontSize: args.size,
    lineHeight: Math.round(args.size * args.lineHeight),
    letterSpacing: args.letterSpacing,
    color: color.ink,
    ...(FRAUNCES_SOFT_VARIATION ?? {}),
  };
}

export function bodyStyle(args: BodyStyleArgs): TextStyle {
  const weight: BodyWeight = args.weight ?? 'regular';
  const style: TextStyle = {
    fontFamily: BODY_FAMILY[weight],
    fontSize: args.size,
    lineHeight: Math.round(args.size * args.lineHeight),
    letterSpacing: args.letterSpacing,
    color: color.ink,
  };
  if (args.uppercase) {
    style.textTransform = 'uppercase';
  }
  if (args.tabularNumerals) {
    // Inter ships tabular numerals via fontFeatureSettings on iOS;
    // Android RN ignores this property so digits will fall back to
    // proportional. Acceptable for MVP — can swap to a static tnum
    // build of Inter later.
    style.fontVariant = ['tabular-nums'];
  }
  return style;
}
