import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { durations } from '@/styles/motion';

import { useReducedMotion } from './useReducedMotion';

const HALF_CYCLE_MS = durations.breath / 2;
const PEAK_SCALE = 1.02;
const REST_SCALE = 1.0;

/**
 * Returns a SharedValue<number> that gently oscillates between 1.0 and 1.02
 * over 2400ms, suitable for `transform: [{ scale }]` on the record button or
 * any "idle is alive" element. When the OS reports reduced motion, the value
 * is held at 1.0 so the element appears still but doesn't suddenly jump.
 */
export function useBreathing(): SharedValue<number> {
  const scale = useSharedValue<number>(REST_SCALE);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(scale);
      scale.value = REST_SCALE;
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(PEAK_SCALE, {
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(REST_SCALE, {
          duration: HALF_CYCLE_MS,
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(scale);
    };
  }, [reducedMotion, scale]);

  return scale;
}
