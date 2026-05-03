import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useBreathing } from '@/hooks/useBreathing';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, elevation, motion, radius } from '@/styles/tokens';

import { Ripple } from './Ripple';

export type BigButtonState = 'idle' | 'pressed' | 'recording' | 'review';

interface Props {
  state: BigButtonState;
  onPress: () => void;
  accessibilityLabel?: string;
}

const SIZE_BY_STATE: Record<BigButtonState, number> = {
  idle: 168,
  pressed: 168,
  recording: 200,
  review: 80,
};

/**
 * The hero of the app. A perfect circle that breathes at idle, springs in
 * on press, expands and ripples when recording, then collapses to a 80px
 * pill in review state. Parents are responsible for any layout reflow
 * (e.g. wrapping their layout root with `Layout.springify()` to slide the
 * 80px review pill to the top-right) — this component only handles its
 * intrinsic size, fill, and inner motion.
 */
export function BigButton({ state, onPress, accessibilityLabel }: Props) {
  const reducedMotion = useReducedMotion();
  const breathingScale = useBreathing();

  const pressScale = useSharedValue<number>(1);
  const targetSize = SIZE_BY_STATE[state];

  useEffect(() => {
    cancelAnimation(pressScale);
    if (state === 'pressed') {
      pressScale.value = withSpring(0.96, motion.gentle);
    } else {
      pressScale.value = withSpring(1, motion.gentle);
    }
  }, [state, pressScale]);

  const containerStyle = useAnimatedStyle(() => {
    const breath = state === 'idle' && !reducedMotion ? breathingScale.value : 1;
    return {
      transform: [{ scale: pressScale.value * breath }],
    };
  });

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const isRecording = state === 'recording';
  const isReview = state === 'review';
  const bgColor = state === 'pressed' || state === 'recording' ? color.emberDeep : color.ember;
  const elevationStyle = isRecording ? elevation.active : elevation.lift;
  const iconSize = isReview ? 28 : isRecording ? 56 : 48;

  const resolvedLabel =
    accessibilityLabel ??
    (isRecording ? 'Recording. Double-tap to stop.' : 'Record. Double-tap to start.');

  return (
    <View style={styles.wrapper}>
      <Ripple active={isRecording} size={targetSize} />
      <Animated.View style={containerStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={resolvedLabel}
          accessibilityState={{ busy: isRecording }}
          onPress={handlePress}
          style={[
            styles.button,
            elevationStyle,
            { width: targetSize, height: targetSize, backgroundColor: bgColor },
          ]}
        >
          {isRecording ? <Waveform /> : null}
          {!isRecording ? (
            <MaterialCommunityIcons name="microphone-outline" size={iconSize} color={color.paper} />
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * A tiny animated waveform used inside the recording state. Five vertical
 * bars in `paper` that oscillate independently. Honors reduced motion by
 * sitting still at a mid-amplitude.
 */
function Waveform() {
  const reducedMotion = useReducedMotion();
  return (
    <View style={styles.waveform}>
      {[0, 80, 160, 240, 320].map((delay, index) => (
        <WaveformBar key={index} delay={delay} reducedMotion={reducedMotion} />
      ))}
    </View>
  );
}

interface BarProps {
  delay: number;
  reducedMotion: boolean;
}

function WaveformBar({ delay, reducedMotion }: BarProps) {
  const height = useSharedValue<number>(reducedMotion ? 18 : 8);

  useEffect(() => {
    if (reducedMotion) {
      height.value = 18;
      return;
    }
    height.value = withRepeat(
      withSequence(
        withTiming(28, {
          duration: 480,
          easing: Easing.inOut(Easing.cubic),
        }),
        withTiming(8, {
          duration: 480,
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
      -1,
      true,
    );
    void delay;
    return () => {
      cancelAnimation(height);
    };
  }, [delay, reducedMotion, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.waveformBar, animatedStyle]} />;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: color.paper,
  },
});
