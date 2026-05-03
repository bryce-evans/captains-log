import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { copyAsync } from 'expo-file-system/legacy';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  type ImagePickerResult,
} from 'expo-image-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { BodyMd, MicroCaps } from '@/components/type';
import { ensureRecordDir, pathForPhoto } from '@/storage/FileStorageService';
import { color, radius, space } from '@/styles/tokens';

interface Props {
  recordId: string;
  existingCount: number;
  onPicked: (path: string) => void;
}

type PickerSource = 'camera' | 'library';

async function pickFromSource(source: PickerSource): Promise<ImagePickerResult> {
  if (source === 'camera') {
    const permission = await requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      return { canceled: true, assets: null };
    }
    return launchCameraAsync({ mediaTypes: MediaTypeOptions.Images, quality: 0.85 });
  }
  const permission = await requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    return { canceled: true, assets: null };
  }
  return launchImageLibraryAsync({ mediaTypes: MediaTypeOptions.Images, quality: 0.85 });
}

/**
 * Quiet ghost button that lives left of the BigButton on the Record screen.
 * Tap → opens a small bottom sheet with Camera / Library options. The sheet
 * is a Modal so it isn't confined to the 44pt button slot in the parent
 * layout. Camera is hidden on the iOS simulator (no camera available there).
 */
export function PhotoAttachButton({ recordId, existingCount, onPicked }: Props) {
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);

  const isDevice = Constants.isDevice ?? true;

  const handlePick = async (source: PickerSource): Promise<void> => {
    setShowOptions(false);
    if (busy) return;
    setBusy(true);
    try {
      const result = await pickFromSource(source);
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset) return;
      await ensureRecordDir(recordId);
      const destination = pathForPhoto(recordId, existingCount);
      await copyAsync({ from: asset.uri, to: destination });
      onPicked(destination);
    } catch {
      // Picker errors (camera not available, permission denied) are best-effort.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Attach a photo"
        accessibilityState={{ busy }}
        onPress={() => setShowOptions(true)}
        style={styles.button}
      >
        <Feather name="image" size={20} color={color.inkMuted} />
      </Pressable>
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Dismiss"
          onPress={() => setShowOptions(false)}
        />
        <View style={styles.sheetContainer} pointerEvents="box-none">
          <View style={styles.sheet}>
            <MicroCaps style={styles.sheetTitle}>Attach a photo</MicroCaps>
            {isDevice ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take photo with camera"
                onPress={() => {
                  void handlePick('camera');
                }}
                style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              >
                <Feather name="camera" size={20} color={color.ink} />
                <BodyMd style={styles.rowLabel}>Take a photo</BodyMd>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pick photo from library"
              onPress={() => {
                void handlePick('library');
              }}
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <Feather name="image" size={20} color={color.ink} />
              <BodyMd style={styles.rowLabel}>Choose from library</BodyMd>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setShowOptions(false)}
              style={({ pressed }) => [styles.cancelRow, pressed ? styles.pressed : null]}
            >
              <BodyMd style={styles.cancelLabel}>Cancel</BodyMd>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 34, 53, 0.4)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.paperDeep,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    gap: space.md,
  },
  sheetTitle: {
    color: color.inkSoft,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    backgroundColor: color.cream,
    borderRadius: radius.md,
  },
  rowLabel: {
    color: color.ink,
  },
  cancelRow: {
    paddingVertical: space.md,
    alignItems: 'center',
  },
  cancelLabel: {
    color: color.inkMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
