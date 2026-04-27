import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SchemaField, FieldState } from '../store';
import { Colors, Fonts } from '../theme';

interface Props {
  fields: SchemaField[];
  fieldState: { [key: string]: FieldState };
}

function ChecklistRow({ field, state }: { field: SchemaField; state: FieldState }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.resolved) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.04, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      Animated.timing(opacity, { toValue: 0.5, duration: 400, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [state.resolved]);

  const iconColor = state.resolved
    ? Colors.done
    : field.important
    ? Colors.important
    : Colors.textMuted;

  const icon = state.resolved ? '✓' : field.important ? '!' : '○';

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ scale }] }]}>
      <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
      <View style={styles.labelArea}>
        <Text
          style={[
            styles.label,
            state.resolved && styles.labelDone,
            field.important && !state.resolved && styles.labelImportant,
          ]}
        >
          {field.label}
        </Text>
        {state.resolved && state.value ? (
          <Text style={styles.value}>{state.value}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export function LiveChecklist({ fields, fieldState }: Props) {
  const pending = fields.filter((f) => !fieldState[f.key]?.resolved);
  const done = fields.filter((f) => fieldState[f.key]?.resolved);
  const sorted = [...pending, ...done];

  return (
    <View style={styles.container}>
      {sorted.map((field) => (
        <ChecklistRow
          key={field.key}
          field={field}
          state={fieldState[field.key] || { value: null, resolved: false }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.paperDark,
  },
  icon: { fontSize: 20, width: 30, fontFamily: Fonts.bodyBold, marginTop: 2 },
  labelArea: { flex: 1 },
  label: {
    fontSize: 18,
    fontFamily: Fonts.bodyBold,
    color: Colors.textPrimary,
  },
  labelDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
    fontFamily: Fonts.body,
  },
  labelImportant: { color: Colors.important },
  value: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.primary,
    marginTop: 1,
  },
});
