import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { color } from '@/styles/tokens';

interface Props {
  children: ReactNode;
  edges?: ReadonlyArray<Edge>;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_EDGES: ReadonlyArray<Edge> = ['top', 'left', 'right'];

/**
 * The base layer for every screen. Renders the warm `paper` background, a
 * synthesized grain texture (~7% opacity SVG dot pattern), and a soft warm
 * radial haze anchored 10% from the top — the morning-light hint from
 * DESIGN.md. Children render above the atmosphere layers.
 *
 * Texture choice: we synthesize the grain via react-native-svg <Pattern>
 * because no `assets/textures/grain.png` ships with the repo and SVG works
 * identically on iOS and Android without an asset round-trip. The pattern
 * is a low-density field of 0.5px dots at 7% opacity over the paper fill.
 */
export function Surface({ children, edges = DEFAULT_EDGES, style }: Props) {
  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <Pattern id="grain" patternUnits="userSpaceOnUse" width="6" height="6">
              <Rect width="6" height="6" fill={color.paper} />
              <Circle cx="1" cy="1" r="0.4" fill={color.ink} opacity={0.07} />
              <Circle cx="4" cy="3" r="0.3" fill={color.ink} opacity={0.05} />
              <Circle cx="2" cy="5" r="0.35" fill={color.ink} opacity={0.06} />
            </Pattern>
            <RadialGradient
              id="haze"
              cx="50%"
              cy="10%"
              rx="80%"
              ry="50%"
              fx="50%"
              fy="10%"
              gradientUnits="objectBoundingBox"
            >
              <Stop offset="0%" stopColor={color.ember} stopOpacity={0.06} />
              <Stop offset="100%" stopColor={color.ember} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grain)" />
          <Rect width="100%" height="100%" fill="url(#haze)" />
        </Svg>
      </View>
      <SafeAreaView edges={edges} style={[styles.safe, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.paper,
  },
  safe: {
    flex: 1,
  },
});
