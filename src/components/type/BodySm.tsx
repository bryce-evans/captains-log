import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { type } from '@/styles/tokens';

import { bodyStyle } from './baseText';

interface Props {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
}

const baseStyle = bodyStyle({
  size: type.size.small,
  lineHeight: type.line.body,
  letterSpacing: type.track.body,
});

export function BodySm({ children, style, numberOfLines, accessibilityRole }: Props) {
  return (
    <Text
      style={[baseStyle, style]}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </Text>
  );
}
