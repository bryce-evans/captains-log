import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { DisplayHero } from '@/components/type';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { color, motion } from '@/styles/tokens';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
}

const WORD_CADENCE_MS = 120;
const WORD_FADE_MS = 280;

/**
 * Streams an answer in word-by-word at conversational pace. Each word fades
 * in over `motion.base` (280ms) and a new word arrives every ~120ms so the
 * answer reads at speech speed rather than character-by-character.
 *
 * Reduced-motion: render the full text instantly and skip the staggered
 * reveal entirely.
 */
export function StreamingAnswer({ text, style }: Props) {
  const reducedMotion = useReducedMotion();
  const tokens = useMemo(() => splitWords(text), [text]);
  const [revealedCount, setRevealedCount] = useState<number>(reducedMotion ? tokens.length : 0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (reducedMotion) {
      setRevealedCount(tokens.length);
      return;
    }
    setRevealedCount(0);
    if (tokens.length === 0) {
      return;
    }
    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setRevealedCount(i);
      if (i >= tokens.length && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, WORD_CADENCE_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tokens, reducedMotion]);

  if (tokens.length === 0) {
    return null;
  }

  return (
    <DisplayHero style={[styles.text, style]}>
      {tokens.map((token, index) => (
        <AnimatedWord
          key={`${index}-${token}`}
          token={token}
          revealed={index < revealedCount}
          reducedMotion={reducedMotion}
        />
      ))}
    </DisplayHero>
  );
}

interface AnimatedWordProps {
  token: string;
  revealed: boolean;
  reducedMotion: boolean;
}

function AnimatedWord({ token, revealed, reducedMotion }: AnimatedWordProps) {
  const opacity = useSharedValue<number>(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = revealed
      ? withTiming(1, {
          duration: WORD_FADE_MS,
          easing: Easing.out(Easing.cubic),
        })
      : 0;
  }, [revealed, reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Wrapping individual word spans in a row keeps line wrapping intact while
  // still letting each word fade independently.
  return (
    <Animated.Text style={animatedStyle} accessible={false}>
      {token}
    </Animated.Text>
  );
}

/**
 * Tokenize keeping trailing whitespace so the natural spacing between
 * words is preserved when each token is emitted as its own animated span.
 */
function splitWords(input: string): readonly string[] {
  if (!input) {
    return [];
  }
  const matches = input.match(/\S+\s*/g);
  return matches ? Object.freeze(matches) : Object.freeze([input]);
}

/**
 * A subtle pulsing ellipsis caption used while the AI engine is in flight.
 * Three dots that ride a slow opacity loop. We do not render a spinner per
 * DESIGN.md anti-patterns.
 */
export function PulsingEllipsis({ label }: { label: string }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue<number>(reducedMotion ? 0.7 : 0.4);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.7;
      return;
    }
    opacity.value = withTiming(1, {
      duration: motion.slow,
      easing: Easing.inOut(Easing.cubic),
    });
    const id = setInterval(() => {
      opacity.value = withTiming(opacity.value > 0.7 ? 0.4 : 1, {
        duration: motion.slow,
        easing: Easing.inOut(Easing.cubic),
      });
    }, motion.slow);
    return () => clearInterval(id);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulse, animatedStyle]}>
      <View accessibilityElementsHidden importantForAccessibility="no" style={styles.pulseInner}>
        <Dot />
        <Dot />
        <Dot />
      </View>
      <Animated.Text style={styles.pulseLabel}>{label}</Animated.Text>
    </Animated.View>
  );
}

function Dot() {
  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  text: {
    color: color.ink,
  },
  pulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseInner: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  pulseLabel: {
    color: color.inkSoft,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.inkSoft,
  },
});
