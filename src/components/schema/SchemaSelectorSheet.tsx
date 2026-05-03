import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SunGlyph, WaveGlyph } from '@/components/glyphs';
import { PillSelector, type PillItem } from '@/components/primitives';
import { BodyMd, DisplayHead, MicroCaps } from '@/components/type';
import { SchemaRepository } from '@/db/SchemaRepository';
import { ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID } from '@/db/seedSchemas';
import type { Schema } from '@/db/schema';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { selectActiveSchema, useStore } from '@/store';
import { color, motion, radius, space } from '@/styles/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const DESCRIPTIONS: Readonly<Record<string, string>> = {
  [FISHING_SCHEMA_ID]: 'A fish caught, a place, a memory.',
  [ART_SHOW_SCHEMA_ID]: 'A piece sold, a buyer, the price.',
};

function descriptionFor(schema: Schema): string {
  return DESCRIPTIONS[schema.id] ?? 'A custom log.';
}

function glyphFor(schemaId: string): React.ReactNode | undefined {
  if (schemaId === FISHING_SCHEMA_ID) {
    return <WaveGlyph />;
  }
  if (schemaId === ART_SHOW_SCHEMA_ID) {
    return <SunGlyph />;
  }
  return undefined;
}

/**
 * A modal sheet that rises from the bottom over a dimmed Record screen.
 * Lists schemas as PillSelector items with per-schema decorative glyphs.
 * Picking an item updates the Zustand active schema and dismisses the sheet.
 */
export function SchemaSelectorSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const activeSchema = useStore(selectActiveSchema);
  const setActiveSchema = useStore((state) => state.setActiveSchema);
  const [schemas, setSchemas] = useState<ReadonlyArray<Schema>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const translateY = useSharedValue<number>(600);
  const backdropOpacity = useSharedValue<number>(0);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let mounted = true;
    setLoading(true);
    SchemaRepository.findAll()
      .then((all) => {
        if (mounted) {
          setSchemas(all);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setSchemas([]);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        translateY.value = 0;
        backdropOpacity.value = 1;
      } else {
        translateY.value = withSpring(0, motion.gentle);
        backdropOpacity.value = withTiming(1, {
          duration: motion.base,
          easing: Easing.out(Easing.cubic),
        });
      }
    } else {
      translateY.value = withTiming(600, {
        duration: motion.base,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: motion.quick });
    }
  }, [visible, reducedMotion, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const items = useMemo<ReadonlyArray<PillItem>>(
    () =>
      schemas.map((schema) => ({
        id: schema.id,
        name: schema.name,
        description: descriptionFor(schema),
        fieldCount: schema.fields.length,
        glyph: glyphFor(schema.id),
      })),
    [schemas],
  );

  const handleSelect = async (id: string): Promise<void> => {
    try {
      await setActiveSchema(id);
      onClose();
    } catch {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Dismiss schema selector"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + space.xl }, sheetStyle]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <DisplayHead>Choose a log</DisplayHead>
            <MicroCaps style={styles.subtitle}>
              {loading ? 'Loading…' : 'Tap to switch — your records stay where they are.'}
            </MicroCaps>
          </View>
          {!loading && schemas.length === 0 ? (
            <BodyMd style={styles.empty}>No schemas yet.</BodyMd>
          ) : (
            <PillSelector
              items={items}
              activeId={activeSchema?.id}
              onSelect={(id) => {
                void handleSelect(id);
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.ink,
    opacity: 0.32,
  },
  sheet: {
    backgroundColor: color.paperDeep,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.inkGhost,
    marginBottom: space.lg,
  },
  header: {
    marginBottom: space.lg,
  },
  subtitle: {
    color: color.inkSoft,
    marginTop: space.sm,
  },
  empty: {
    color: color.inkMuted,
    paddingVertical: space.lg,
  },
});
