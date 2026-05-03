import { motion as motionToken } from './tokens';

/**
 * Spring configurations + durations consumed by Reanimated worklets and
 * timing animations. The token values live in tokens.ts so we re-export
 * here as a convenience for motion-only imports.
 */

export const springs = {
  gentle: motionToken.gentle,
  buoyant: motionToken.buoyant,
  settle: motionToken.settle,
} as const;

export const durations = {
  quick: motionToken.quick,
  base: motionToken.base,
  slow: motionToken.slow,
  breath: motionToken.breath,
} as const;

export type SpringName = keyof typeof springs;
export type DurationName = keyof typeof durations;
