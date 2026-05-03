import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { DisplayLead, MicroCaps } from '@/components/type';
import { color, elevation, radius, space } from '@/styles/tokens';

/**
 * The floating pill tab bar called out in DESIGN.md. Three word-tabs
 * (no icons) — Inter micro caps for inactive, Fraunces lead for the
 * selected tab. Sits `lg` above the bottom safe area, paper bg + lift
 * elevation, pill radius.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const containerStyle: StyleProp<ViewStyle> = [
    styles.bar,
    elevation.lift,
    { bottom: insets.bottom + space.lg },
  ];

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={containerStyle}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const descriptor = descriptors[route.key];
          if (!descriptor) {
            return null;
          }
          const label =
            (descriptor.options.tabBarLabel as string | undefined) ??
            descriptor.options.title ??
            route.name;

          const onPress = () => {
            void Haptics.selectionAsync();
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              // expo-router types navigate() with a literal-route generic; the
              // dynamic route object we get from BottomTabBarProps doesn't fit
              // that, so we widen here. Safe because react-navigation accepts
              // a string route name at runtime.
              const navigate = navigation.navigate as (name: string, params?: object) => void;
              navigate(route.name, route.params as object | undefined);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={`${label} tab`}
              accessibilityState={{ selected: isFocused }}
              onPress={onPress}
              style={styles.tab}
            >
              {isFocused ? (
                <DisplayLead style={styles.activeLabel} numberOfLines={1}>
                  {label}
                </DisplayLead>
              ) : (
                <MicroCaps style={styles.inactiveLabel} numberOfLines={1}>
                  {label}
                </MicroCaps>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minWidth: 320,
  },
  tab: {
    flex: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  activeLabel: {
    color: color.ink,
  },
  inactiveLabel: {
    color: color.inkMuted,
  },
});
