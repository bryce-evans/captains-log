import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodySm } from '@/components/type';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, elevation, motion, radius, space } from '@/styles/tokens';

interface Props {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  dwellMs?: number;
}

const SLIDE_DISTANCE = 120;
const DEFAULT_DWELL_MS = 3000;

/**
 * A quiet pill that rises from the bottom safe area with a 4px ember stripe
 * along its leading edge. Dwells for `dwellMs`, then drops on the `settle`
 * spring and calls `onDismiss`. The dwell timer runs on the JS thread; the
 * slide is a worklet animation so it stays smooth under load.
 */
export function ToastQuiet({ message, visible, onDismiss, dwellMs = DEFAULT_DWELL_MS }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue<number>(SLIDE_DISTANCE);
  const opacity = useSharedValue<number>(0);

  useEffect(() => {
    cancelAnimation(translateY);
    cancelAnimation(opacity);

    if (!visible) {
      translateY.value = withSpring(SLIDE_DISTANCE, motion.settle);
      opacity.value = withTiming(0, { duration: motion.quick });
      return;
    }

    if (reducedMotion) {
      translateY.value = 0;
      opacity.value = 1;
    } else {
      translateY.value = withSpring(0, motion.gentle);
      opacity.value = withTiming(1, { duration: motion.quick });
    }

    opacity.value = withDelay(
      dwellMs,
      withTiming(0, { duration: motion.quick }, (finished) => {
        if (finished) {
          runOnJS(onDismiss)();
        }
      }),
    );
    translateY.value = withDelay(
      dwellMs,
      reducedMotion
        ? withTiming(SLIDE_DISTANCE, { duration: motion.quick })
        : withSpring(SLIDE_DISTANCE, motion.settle),
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    };
  }, [visible, dwellMs, reducedMotion, onDismiss, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      style={[styles.toast, elevation.lift, { bottom: insets.bottom + space.lg }, animatedStyle]}
    >
      <View style={styles.stripe} />
      <BodySm style={styles.text}>{message}</BodySm>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    backgroundColor: color.paper,
    opacity: 0.95,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  stripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: color.ember,
  },
  text: {
    color: color.ink,
    paddingLeft: space.sm,
  },
});
