import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BodyMd, DisplayLead, MicroCaps } from '@/components/type';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, elevation, radius, space } from '@/styles/tokens';

interface Props {
  label: string;
  value?: string | number;
  important?: boolean;
  listening?: boolean;
  rejecting?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const REJECT_DURATION_MS = 280;

/**
 * The atom of the record screen. Empty/listening state shows a muted label
 * and (optionally) a pulsing dot + wheat stripe. Filled state demotes the
 * label to a micro caps eyebrow and presents the value in display type.
 *
 * The rust rejection wash animates an overlay's opacity rather than
 * remounting the card so the surrounding spring layout stays stable.
 */
export function FieldCard({
  label,
  value,
  important,
  listening,
  rejecting,
  onPress,
  style,
}: Props) {
  const reducedMotion = useReducedMotion();
  const isFilled = value !== undefined && value !== '';

  const dotOpacity = useSharedValue<number>(0.4);
  const rejectOpacity = useSharedValue<number>(0);

  useEffect(() => {
    if (!listening || reducedMotion) {
      cancelAnimation(dotOpacity);
      dotOpacity.value = listening ? 0.6 : 0;
      return;
    }
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(dotOpacity);
    };
  }, [listening, reducedMotion, dotOpacity]);

  useEffect(() => {
    cancelAnimation(rejectOpacity);
    if (!rejecting) {
      rejectOpacity.value = 0;
      return;
    }
    rejectOpacity.value = withSequence(
      withTiming(1, {
        duration: reducedMotion ? 120 : REJECT_DURATION_MS / 2,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(0, {
        duration: reducedMotion ? 120 : REJECT_DURATION_MS / 2,
        easing: Easing.in(Easing.cubic),
      }),
    );
    return () => {
      cancelAnimation(rejectOpacity);
    };
  }, [rejecting, reducedMotion, rejectOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }));

  const rejectStyle = useAnimatedStyle(() => ({
    opacity: rejectOpacity.value * 0.06,
  }));

  const accessibilityLabel = `${label}: ${isFilled ? String(value) : 'empty'}`;
  const cardStyle = [
    styles.card,
    isFilled ? styles.filled : styles.empty,
    isFilled ? elevation.rest : elevation.lift,
    style,
  ];

  const inner = (
    <View style={styles.inner}>
      {important && !isFilled ? <View style={styles.stripe} /> : null}
      {listening && !isFilled ? <Animated.View style={[styles.dot, dotStyle]} /> : null}
      {isFilled ? (
        <View style={styles.filledStack}>
          <MicroCaps style={styles.filledLabel}>{label}</MicroCaps>
          <DisplayLead>{String(value)}</DisplayLead>
        </View>
      ) : (
        <BodyMd style={styles.emptyLabel}>{label}</BodyMd>
      )}
      <Animated.View pointerEvents="none" style={[styles.rejectWash, rejectStyle]} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={cardStyle}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={cardStyle}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  empty: {
    backgroundColor: color.cream,
  },
  filled: {
    backgroundColor: color.paper,
  },
  inner: {
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    minHeight: 72,
    justifyContent: 'center',
  },
  emptyLabel: {
    color: color.inkMuted,
    paddingLeft: space.md,
  },
  filledLabel: {
    color: color.inkSoft,
    marginBottom: space.xs,
  },
  filledStack: {
    paddingLeft: space.xs,
  },
  stripe: {
    position: 'absolute',
    top: space.md,
    bottom: space.md,
    left: space.sm,
    width: 3,
    borderRadius: 2,
    backgroundColor: color.wheat,
  },
  dot: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.ember,
  },
  rejectWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.rust,
  },
});
