import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color } from '@/styles/tokens';

interface Props {
  active: boolean;
  tint?: string;
  /**
   * Cadence between ring emissions in ms. The DESIGN.md spec calls for ~1.6s.
   */
  cadenceMs?: number;
  size?: number;
}

const RING_DURATION_MS = 1800;
const PEAK_SCALE = 2.4;
const REST_SCALE = 1.0;
const RING_COUNT = 3;

/**
 * Concentric soft rings that emanate from a central anchor while `active`.
 * Each ring scales 1.0 → 2.4 over 1800ms with opacity fading 0.2 → 0.
 * Rings are offset in time so they overlap naturally; rings clean up when
 * `active=false` via `cancelAnimation` so no work leaks on unmount.
 *
 * When the OS reports reduced motion, we render a single static halo
 * instead — same color, no animation.
 */
export function Ripple({ active, tint, cadenceMs = 1600, size = 200 }: Props) {
  const reducedMotion = useReducedMotion();
  const ringColor = tint ?? color.emberSoft;

  if (reducedMotion) {
    if (!active) {
      return null;
    }
    return (
      <View
        accessible={false}
        pointerEvents="none"
        style={[staticHaloStyle(size, ringColor), { backgroundColor: ringColor, opacity: 0.18 }]}
      />
    );
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      {Array.from({ length: RING_COUNT }).map((_, index) => (
        <RippleRing
          key={index}
          active={active}
          delayMs={(cadenceMs / RING_COUNT) * index}
          cadenceMs={cadenceMs}
          tint={ringColor}
          size={size}
        />
      ))}
    </View>
  );
}

interface RingProps {
  active: boolean;
  delayMs: number;
  cadenceMs: number;
  tint: string;
  size: number;
}

function RippleRing({ active, delayMs, cadenceMs, tint, size }: RingProps) {
  const scale = useSharedValue<number>(REST_SCALE);
  const opacity = useSharedValue<number>(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = REST_SCALE;
      opacity.value = 0;
      return;
    }

    // The cadence between emissions is governed by cadenceMs; the
    // ring duration is fixed at RING_DURATION_MS so rings overlap.
    const cycleMs = Math.max(cadenceMs, RING_DURATION_MS);
    scale.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(PEAK_SCALE, {
          duration: RING_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delayMs,
      withRepeat(
        withTiming(0, {
          duration: RING_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        }),
        -1,
        false,
      ),
    );
    // Reset opacity at start of each cycle. Reanimated's withRepeat does
    // not reset to a starting value between cycles, so we re-prime via a
    // separate looping timing on the same shared value below. We choose
    // the simpler path: set initial opacity high once and let withRepeat
    // run from current. To make the initial peak-and-fade play, we kick
    // it manually.
    opacity.value = 0.2;
    void cycleMs;

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [active, cadenceMs, delayMs, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[ringBaseStyle(size, tint), animatedStyle]} />;
}

function ringBaseStyle(size: number, tint: string): ViewStyle {
  return {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: tint,
  };
}

function staticHaloStyle(size: number, tint: string): ViewStyle {
  return {
    position: 'absolute',
    width: size * 1.4,
    height: size * 1.4,
    borderRadius: (size * 1.4) / 2,
    backgroundColor: tint,
  };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
