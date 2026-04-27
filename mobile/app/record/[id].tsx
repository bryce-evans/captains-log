import React, { useState } from 'react';
import {
  ImageBackground, Modal, Pressable, ScrollView,
  StyleSheet, View, Image, Platform,
} from 'react-native';
import { Button, Dialog, Portal, Text, Divider, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { getSpeciesImage } from '../../assets/species';
import { useStore } from '../../store';
import { Colors, Fonts } from '../../theme';

function IconBtn({ icon, onPress }: { icon: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color={Colors.white} />
    </Pressable>
  );
}

function PhotoModal({
  visible, source, onClose,
}: {
  visible: boolean;
  source: any;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);

  const handleDownload = async () => {
    if (Platform.OS === 'web') return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') return;

      let uri: string;
      if (source?.uri) {
        uri = source.uri;
      } else {
        // Bundled asset — resolve to local URI first
        const asset = await Asset.fromModule(source).downloadAsync();
        uri = asset.localUri!;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.modalBg}>
        <Image source={source} style={styles.modalImage} resizeMode="contain" />

        <View style={[styles.modalActions, { top: insets.top + 12 }]}>
          <IconBtn icon="close" onPress={onClose} />
          {Platform.OS !== 'web' && (
            <IconBtn icon={saving ? 'loading' : 'download'} onPress={handleDownload} />
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const record = useStore((s) => s.records.find((r) => r.id === id));
  const schema = useStore((s) => s.schemas.find((sc) => sc.id === record?.schemaId));
  const deleteRecord = useStore((s) => s.deleteRecord);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);

  const heroTitle = schema?.fields.find((f) => f.important)?.key
    ? record?.fields[schema.fields.find((f) => f.important)!.key] ?? record?.schemaName
    : record?.schemaName;

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
  const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const photoSrc = record.photoUri
    ? { uri: record.photoUri }
    : getSpeciesImage(heroTitle ?? '');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Hero photo */}
        <ImageBackground
          source={photoSrc ?? undefined}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <View style={styles.heroOverlay} />

          {/* Top-right action */}
          {photoSrc && (
            <View style={styles.heroActions}>
              <IconBtn icon="fullscreen" onPress={() => setPhotoVisible(true)} />
            </View>
          )}

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroDate}>{dateStr} · {timeStr}</Text>
          </View>
        </ImageBackground>

        {/* Field table */}
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

      {/* Full-screen photo modal */}
      {photoSrc && (
        <PhotoModal
          visible={photoVisible}
          source={photoSrc}
          onClose={() => setPhotoVisible(false)}
        />
      )}

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
  scroll: { paddingBottom: 40 },

  hero: { width: '100%', height: 260, marginBottom: 20 },
  heroImage: { resizeMode: 'cover' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryDark,
    opacity: 0.45,
  },
  heroActions: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  heroTitle: { fontFamily: Fonts.heading, fontSize: 36, color: Colors.white, marginBottom: 4 },
  heroDate: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right' },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: 'rgba(0,0,0,0.65)' },

  // Photo modal
  modalBg: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  modalImage: { width: '100%', height: '100%' },
  modalActions: {
    position: 'absolute',
    right: 14,
    flexDirection: 'row',
    gap: 8,
  },

  card: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginHorizontal: 16,
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

  deleteBtn: { marginHorizontal: 16, marginTop: 8, borderColor: Colors.important },
  deleteBtnLabel: { fontFamily: Fonts.bodyBold, letterSpacing: 0.3 },

  dialog: { borderRadius: 16, backgroundColor: Colors.white },
  dialogTitle: { fontFamily: Fonts.heading, color: Colors.textPrimary },
  dialogBody: { fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 22 },
  dialogActions: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  cancelLabel: { fontFamily: Fonts.body },
  deleteLabel: { fontFamily: Fonts.bodyBold },
});
