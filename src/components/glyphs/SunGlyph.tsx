import Svg, { Circle, Line } from 'react-native-svg';

import { color } from '@/styles/tokens';

interface Props {
  size?: number;
  color?: string;
}

const DEFAULT_SIZE = 28;
const STROKE_WIDTH = 1.5;

interface Ray {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Hand-drawn rays — slightly varied lengths so the sun reads as sketched
// rather than geometric.
const RAYS: ReadonlyArray<Ray> = [
  { x1: 14, y1: 2, x2: 14, y2: 5 },
  { x1: 24.5, y1: 6.5, x2: 22.4, y2: 8.4 },
  { x1: 26, y1: 14, x2: 23, y2: 14 },
  { x1: 23.8, y1: 21, x2: 21.7, y2: 19.4 },
  { x1: 5.2, y1: 22, x2: 6.8, y2: 19.6 },
  { x1: 2, y1: 13.6, x2: 5, y2: 14 },
  { x1: 4.4, y1: 6, x2: 6.5, y2: 8.2 },
];

/**
 * A soft circular sun with seven short rays of varying lengths. Strokes
 * use round terminals to match the hand-drawn family of glyphs.
 */
export function SunGlyph({ size = DEFAULT_SIZE, color: tint = color.inkGhost }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Circle
        cx={14}
        cy={14}
        r={5.2}
        stroke={tint}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {RAYS.map((ray, index) => (
        <Line
          key={index}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={tint}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}
