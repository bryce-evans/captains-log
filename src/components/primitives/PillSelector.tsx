import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { BodyMd, DisplayTitle, MicroCaps } from '@/components/type';
import { color, elevation, radius, space } from '@/styles/tokens';

export interface PillItem {
  id: string;
  name: string;
  description: string;
  fieldCount: number;
  glyph?: ReactNode;
}

interface Props {
  items: ReadonlyArray<PillItem>;
  activeId?: string;
  onSelect: (id: string) => void;
}

/**
 * Vertical stack of large rounded selector pills. The active pill is
 * lifted with a soft ember glow on iOS (warm shadow) and an ember-tinted
 * border on Android since coloured shadows aren't honored there. Tap
 * triggers a light haptic and the parent's onSelect.
 */
export function PillSelector({ items, activeId, onSelect }: Props) {
  return (
    <View style={styles.stack}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <Pill
            key={item.id}
            item={item}
            active={isActive}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(item.id);
            }}
          />
        );
      })}
    </View>
  );
}

interface PillProps {
  item: PillItem;
  active: boolean;
  onPress: () => void;
}

function Pill({ item, active, onPress }: PillProps) {
  const accessibilityLabel = `${item.name}, ${item.description}, ${item.fieldCount} fields`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.pill,
        active ? styles.pillActive : styles.pillInactive,
        active ? activeShadowStyle : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.text}>
          <DisplayTitle>{item.name}</DisplayTitle>
          <BodyMd style={styles.description}>{item.description}</BodyMd>
          <MicroCaps style={styles.count}>{`${item.fieldCount} fields`}</MicroCaps>
        </View>
        {item.glyph ? <View style={styles.glyph}>{item.glyph}</View> : null}
      </View>
    </Pressable>
  );
}

const activeShadowStyle: ViewStyle =
  Platform.OS === 'ios'
    ? {
        ...elevation.lift,
        shadowColor: color.ember,
        shadowOpacity: 0.18,
        shadowRadius: 18,
      }
    : {
        ...elevation.lift,
        borderWidth: 1,
        borderColor: color.emberSoft,
      };

const styles = StyleSheet.create({
  stack: {
    gap: space.lg,
  },
  pill: {
    borderRadius: radius.xl,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
  },
  pillInactive: {
    backgroundColor: color.paperDeep,
  },
  pillActive: {
    backgroundColor: color.cream,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  description: {
    color: color.inkMuted,
    marginTop: space.xs,
  },
  count: {
    color: color.inkSoft,
    marginTop: space.sm,
  },
  glyph: {
    width: 28,
    height: 28,
    marginLeft: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
