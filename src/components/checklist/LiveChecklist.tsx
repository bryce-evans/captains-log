import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { FieldCard } from '@/components/primitives';
import { MicroCaps } from '@/components/type';
import type { FieldMap, Schema, SchemaField } from '@/db/schema';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { selectActiveSchema, selectDraft, useStore } from '@/store';
import { color, motion, space } from '@/styles/tokens';

interface Props {
  activeFieldKey?: string;
  rejectingFieldKey?: string;
  onFieldPress?: (field: SchemaField) => void;
}

interface BucketedFields {
  readonly empty: ReadonlyArray<SchemaField>;
  readonly filled: ReadonlyArray<SchemaField>;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return false;
}

function bucketFields(schema: Schema, draft: FieldMap): BucketedFields {
  const empty: SchemaField[] = [];
  const filled: SchemaField[] = [];
  for (const field of schema.fields) {
    if (isEmpty(draft[field.key])) {
      empty.push(field);
    } else {
      filled.push(field);
    }
  }
  empty.sort((a, b) => {
    if (a.important === b.important) {
      return 0;
    }
    return a.important ? -1 : 1;
  });
  return { empty: Object.freeze(empty), filled: Object.freeze(filled) };
}

/**
 * Pure subscriber for the Record screen. Reads activeSchema + draft from
 * Zustand and renders one FieldCard per field, important-first while empty,
 * filled fields below a hairline divider with a "filled" caption. Reorder
 * uses Reanimated LinearTransition for the spring layout animation; reduced
 * motion swaps to a quick-fade timing.
 */
export function LiveChecklist({ activeFieldKey, rejectingFieldKey, onFieldPress }: Props) {
  const schema = useStore(selectActiveSchema);
  const draft = useStore(selectDraft);
  const reducedMotion = useReducedMotion();

  const buckets = useMemo<BucketedFields>(() => {
    if (!schema) {
      return { empty: [], filled: [] };
    }
    return bucketFields(schema, draft);
  }, [schema, draft]);

  if (!schema) {
    return null;
  }

  const transition = reducedMotion
    ? LinearTransition.duration(motion.quick)
    : LinearTransition.springify()
        .damping(motion.gentle.damping)
        .stiffness(motion.gentle.stiffness);

  return (
    <View style={styles.container}>
      {buckets.empty.map((field) => {
        const value = draft[field.key];
        return (
          <Animated.View key={field.key} layout={transition}>
            <FieldCard
              label={field.label}
              value={value}
              important={field.important}
              listening={field.key === activeFieldKey}
              rejecting={field.key === rejectingFieldKey}
              onPress={onFieldPress ? () => onFieldPress(field) : undefined}
            />
          </Animated.View>
        );
      })}
      {buckets.filled.length > 0 ? (
        <Animated.View layout={transition} style={styles.divider}>
          <View style={styles.dividerLine} />
          <MicroCaps style={styles.dividerCaption}>filled</MicroCaps>
          <View style={styles.dividerLine} />
        </Animated.View>
      ) : null}
      {buckets.filled.map((field) => {
        const value = draft[field.key];
        return (
          <Animated.View key={field.key} layout={transition}>
            <FieldCard
              label={field.label}
              value={value}
              important={field.important}
              listening={false}
              rejecting={field.key === rejectingFieldKey}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginVertical: space.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: color.mist,
  },
  dividerCaption: {
    color: color.inkSoft,
  },
});
