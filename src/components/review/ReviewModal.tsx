import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { BodyMd, DisplayTitle, MicroCaps } from '@/components/type';
import type { SchemaField } from '@/db/schema';
import type { RecordRow } from '@/db/schema';
import { color, elevation, radius, space } from '@/styles/tokens';

interface Props {
  visible: boolean;
  emptyFields: ReadonlyArray<SchemaField>;
  onSaveAnyway: () => Promise<RecordRow | void>;
  onAddByVoice: () => void;
  onCancel: () => void;
}

/**
 * A "before-you-save" modal that lists important fields the user didn't
 * fill. Three actions: save anyway (proceeds via forceMarkDone), add by
 * voice (closes modal and resumes the voice session), cancel (returns to
 * the Record screen with the draft intact). The modal does not block the
 * JS thread — the Save Anyway button awaits the save and stays disabled
 * for that round-trip.
 */
export function ReviewModal({ visible, emptyFields, onSaveAnyway, onAddByVoice, onCancel }: Props) {
  const [saving, setSaving] = useState<boolean>(false);

  const handleSaveAnyway = async (): Promise<void> => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await onSaveAnyway();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Dismiss review"
          accessibilityRole="button"
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.backdrop} />
        </Pressable>
        <View style={[styles.card, elevation.lift]} accessibilityViewIsModal>
          <View style={styles.header}>
            <DisplayTitle>Before we save…</DisplayTitle>
            <BodyMd style={styles.subtitle}>These important fields are still empty:</BodyMd>
          </View>
          <View style={styles.list}>
            {emptyFields.map((field) => (
              <View key={field.key} style={styles.row}>
                <View style={styles.dot} />
                <BodyMd style={styles.fieldLabel}>{field.label}</BodyMd>
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add by voice — keep the draft and resume recording"
              onPress={onAddByVoice}
              style={[styles.actionPrimary]}
            >
              <BodyMd style={styles.actionPrimaryText}>Add by voice</BodyMd>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save anyway — proceed with empty important fields"
              accessibilityState={{ disabled: saving }}
              onPress={() => {
                void handleSaveAnyway();
              }}
              style={[styles.actionSecondary, saving ? styles.actionDisabled : null]}
            >
              <BodyMd style={styles.actionSecondaryText}>
                {saving ? 'Saving…' : 'Save anyway'}
              </BodyMd>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel — return to the record screen"
              onPress={onCancel}
              style={styles.actionGhost}
            >
              <MicroCaps style={styles.actionGhostText}>Cancel</MicroCaps>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.ink,
    opacity: 0.36,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: color.paperDeep,
    borderRadius: radius.xl,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
  },
  header: {
    marginBottom: space.lg,
  },
  subtitle: {
    color: color.inkMuted,
    marginTop: space.sm,
  },
  list: {
    gap: space.sm,
    marginBottom: space.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.wheat,
  },
  fieldLabel: {
    color: color.ink,
  },
  actions: {
    gap: space.sm,
  },
  actionPrimary: {
    backgroundColor: color.ember,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  actionPrimaryText: {
    color: color.paper,
  },
  actionSecondary: {
    backgroundColor: color.cream,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  actionSecondaryText: {
    color: color.ink,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  actionGhost: {
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  actionGhostText: {
    color: color.inkSoft,
  },
});
