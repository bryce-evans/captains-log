import Svg, { Path } from 'react-native-svg';

import { color } from '@/styles/tokens';

interface Props {
  size?: number;
  color?: string;
}

const DEFAULT_SIZE = 28;
const STROKE_WIDTH = 1.5;

/**
 * A single-stroke horizontal wave with one small crest, drawn with soft
 * round terminals. Hand-drawn feel — the control points are intentionally
 * uneven so the curve doesn't read as algorithmic.
 */
export function WaveGlyph({ size = DEFAULT_SIZE, color: tint = color.inkGhost }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Path
        d="M3 16 C 6 13, 9 13, 12 16 S 17 19, 20 16 S 24 13, 26 14"
        stroke={tint}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
