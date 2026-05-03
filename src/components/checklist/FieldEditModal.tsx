import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { BodyMd, DisplayLead, MicroCaps } from '@/components/type';
import type { FieldValue, SchemaField } from '@/db/schema';
import { color, radius, space } from '@/styles/tokens';

interface Props {
  visible: boolean;
  field: SchemaField | null;
  initialValue: FieldValue | undefined;
  onSave: (key: string, value: FieldValue) => void;
  onClear: (key: string) => void;
  onCancel: () => void;
}

function formatInitial(value: FieldValue | undefined): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

/**
 * Tap-to-edit modal for fields. Lets users type values manually when voice
 * isn't available (simulator, low-battery, hands-free not appropriate).
 * Coerces numerics on save and forwards through the same Zustand setField
 * so the visible state stays consistent with the voice flow.
 */
export function FieldEditModal({ visible, field, initialValue, onSave, onClear, onCancel }: Props) {
  const [text, setText] = useState<string>(() => formatInitial(initialValue));

  useEffect(() => {
    if (visible) {
      setText(formatInitial(initialValue));
    }
  }, [visible, initialValue]);

  if (!field) {
    return null;
  }

  const isNumeric = field.type === 'number';

  function commit() {
    if (!field) return;
    const trimmed = text.trim();
    if (trimmed === '') {
      onClear(field.key);
      return;
    }
    if (isNumeric) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        onSave(field.key, parsed);
        return;
      }
      // If parsing fails fall back to clearing the field instead of saving
      // a typed string into a numeric column.
      onClear(field.key);
      return;
    }
    onSave(field.key, trimmed);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />
        <View style={styles.sheet}>
          <MicroCaps style={styles.label}>{field.label}</MicroCaps>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isNumeric ? 'a number' : 'type a value'}
            placeholderTextColor={color.inkGhost}
            keyboardType={isNumeric ? 'decimal-pad' : 'default'}
            autoFocus
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={commit}
            style={styles.input}
          />
          {field.type === 'enum' && field.enumValues ? (
            <View style={styles.enumRow}>
              {field.enumValues.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [styles.chip, pressed ? styles.chipPressed : null]}
                  onPress={() => setText(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${opt}`}
                >
                  <BodyMd style={styles.chipLabel}>{opt}</BodyMd>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.action} accessibilityRole="button">
              <BodyMd style={styles.cancel}>Cancel</BodyMd>
            </Pressable>
            <Pressable
              onPress={commit}
              style={[styles.action, styles.primary]}
              accessibilityRole="button"
            >
              <DisplayLead style={styles.primaryLabel}>Save</DisplayLead>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 34, 53, 0.4)',
  },
  sheet: {
    backgroundColor: color.paperDeep,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
  },
  label: {
    color: color.inkSoft,
  },
  input: {
    fontSize: 19,
    color: color.ink,
    backgroundColor: color.cream,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  enumRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.cream,
  },
  chipPressed: {
    opacity: 0.6,
  },
  chipLabel: {
    color: color.ink,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.md,
    marginTop: space.sm,
  },
  action: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  cancel: {
    color: color.inkMuted,
  },
  primary: {
    backgroundColor: color.ember,
  },
  primaryLabel: {
    color: color.paper,
  },
});
