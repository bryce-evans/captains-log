import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SchemaField, FieldState } from '../store';

interface Props {
  fields: SchemaField[];
  fieldState: { [key: string]: FieldState };
}

function ChecklistRow({ field, state }: { field: SchemaField; state: FieldState }) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state.resolved) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.05, duration: 120, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      Animated.timing(opacity, { toValue: 0.55, duration: 400, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [state.resolved]);

  const icon = state.resolved ? '✓' : field.important ? '!' : '○';
  const iconColor = state.resolved
    ? '#4CAF50'
    : field.important
    ? theme.colors.error
    : theme.colors.onSurfaceVariant;

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ scale }] }]}>
      <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
      <View style={styles.labelArea}>
        <Text
          style={[
            styles.label,
            state.resolved && styles.resolved,
            field.important && !state.resolved && styles.important,
          ]}
        >
          {field.label}
        </Text>
        {state.resolved && state.value ? (
          <Text style={styles.value} numberOfLines={1}>
            {state.value}
          </Text>
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
        <ChecklistRow key={field.key} field={field} state={fieldState[field.key] || { value: null, resolved: false }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  icon: { fontSize: 18, width: 28, fontWeight: 'bold', marginTop: 1 },
  labelArea: { flex: 1 },
  label: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  resolved: { color: '#888', textDecorationLine: 'line-through' },
  important: { color: '#c0392b' },
  value: { fontSize: 13, color: '#555', marginTop: 1 },
});
