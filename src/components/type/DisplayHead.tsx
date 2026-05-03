import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { type } from '@/styles/tokens';

import { displayStyle } from './baseText';

interface Props {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text';
}

const baseStyle = displayStyle({
  size: type.size.head,
  lineHeight: type.line.snug,
  letterSpacing: type.track.snug,
});

export function DisplayHead({ children, style, numberOfLines, accessibilityRole }: Props) {
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
