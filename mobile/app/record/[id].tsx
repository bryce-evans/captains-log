import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Image } from 'react-native';
import { Button, Dialog, Portal, Text, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../store';
import { Colors, Fonts } from '../../theme';

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const record = useStore((s) => s.records.find((r) => r.id === id));
  const schema = useStore((s) => s.schemas.find((sc) => sc.id === record?.schemaId));
  const deleteRecord = useStore((s) => s.deleteRecord);

  const heroTitle = schema?.fields.find((f) => f.important)?.key
    ? record?.fields[schema.fields.find((f) => f.important)!.key] ?? record?.schemaName
    : record?.schemaName;
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleDelete = async () => {
    setConfirmVisible(false);
    await deleteRecord(id!);
    router.back();
  };

  if (!record) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Record not found.</Text>
      </SafeAreaView>
    );
  }

  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{record.schemaEmoji}</Text>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{record.schemaName}</Text>
          <Text style={styles.heroDate}>{dateStr}</Text>
          <Text style={styles.heroTime}>{timeStr}</Text>
        </View>

        <Surface style={styles.card} elevation={1}>
          {Object.entries(record.fields).map(([key, value], idx, arr) => (
            <React.Fragment key={key}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldKey}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
                <Text style={styles.fieldVal}>{value}</Text>
              </View>
              {idx < arr.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Surface>

        {record.photoUri ? (
          <Surface style={styles.photoCard} elevation={1}>
            <Image source={{ uri: record.photoUri }} style={styles.photo} resizeMode="cover" />
          </Surface>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>📷 No photo attached</Text>
          </View>
        )}

        <Button
          mode="outlined"
          onPress={() => setConfirmVisible(true)}
          style={styles.deleteBtn}
          labelStyle={styles.deleteBtnLabel}
          textColor={Colors.important}
        >
          Delete Record
        </Button>
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Delete this record?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogBody}>
              This will permanently remove the {record.schemaName} record from {dateStr}. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setConfirmVisible(false)}
              textColor={Colors.textMuted}
              labelStyle={styles.cancelLabel}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              buttonColor={Colors.important}
              labelStyle={styles.deleteLabel}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  hero: { alignItems: 'center', marginBottom: 24, paddingVertical: 16 },
  heroEmoji: { fontSize: 64, marginBottom: 8 },
  heroTitle: { fontFamily: Fonts.heading, fontSize: 32, color: Colors.textPrimary, textAlign: 'center' },
  heroSubtitle: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, marginTop: 2, marginBottom: 2 },
  heroDate: { color: Colors.textMuted, marginTop: 4 },
  heroTime: { color: Colors.textMuted, fontSize: 13 },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fieldKey: { color: Colors.textMuted, fontSize: 14, flex: 1 },
  fieldVal: { fontWeight: '600', color: Colors.textPrimary, fontSize: 14, flex: 1, textAlign: 'right' },
  photoCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  photo: { width: '100%', height: 240 },
  noPhoto: { alignItems: 'center', padding: 24 },
  noPhotoText: { color: '#bbb', fontSize: 14 },
  deleteBtn: { marginTop: 8, marginBottom: 32, borderColor: Colors.important },
  deleteBtnLabel: { fontFamily: Fonts.bodyBold, letterSpacing: 0.3 },

  dialog: { borderRadius: 16, backgroundColor: Colors.white },
  dialogTitle: { fontFamily: Fonts.heading, color: Colors.textPrimary },
  dialogBody: { fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 22 },
  dialogActions: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  cancelLabel: { fontFamily: Fonts.body },
  deleteLabel: { fontFamily: Fonts.bodyBold },
});
