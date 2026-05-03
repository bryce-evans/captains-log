import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AudioPlayPill } from '@/components/audio/AudioPlayPill';
import { Surface } from '@/components/primitives';
import { BodyMd, DisplayGrand, DisplayLead, MicroCaps } from '@/components/type';
import { RecordRepository } from '@/db/RecordRepository';
import type { RecordRow, Schema } from '@/db/schema';
import { SchemaRepository } from '@/db/SchemaRepository';
import { selectActiveSchema, useStore } from '@/store';
import { color, radius, space } from '@/styles/tokens';
import { getRecordDetailPairs, getRecordTitle, formatTimestamp } from '@/utils/formatRecord';
import { logger } from '@/utils/logger';

const PHOTO_ASPECT = 4 / 3;

interface ScreenState {
  record: RecordRow | null;
  schema: Schema | null;
  status: 'loading' | 'ready' | 'missing';
}

export default function RecordDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activeSchema = useStore(selectActiveSchema);
  const { width } = useWindowDimensions();

  const [state, setState] = useState<ScreenState>({
    record: null,
    schema: null,
    status: 'loading',
  });

  const recordId = params.id;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        if (!recordId) {
          if (active) {
            setState({ record: null, schema: null, status: 'missing' });
          }
          return;
        }
        try {
          const record = await RecordRepository.findById(recordId);
          if (!record) {
            if (active) {
              setState({ record: null, schema: null, status: 'missing' });
            }
            return;
          }
          const schema =
            activeSchema && activeSchema.id === record.schemaId
              ? activeSchema
              : await SchemaRepository.findById(record.schemaId);
          if (active) {
            setState({ record, schema, status: 'ready' });
          }
        } catch (err) {
          logger.warn('RecordDetail: failed to load', err);
          if (active) {
            setState({ record: null, schema: null, status: 'missing' });
          }
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, [recordId, activeSchema]),
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/logbook');
    }
  }, [router]);

  const handleDelete = useCallback(async () => {
    if (!state.record) {
      return;
    }
    try {
      await RecordRepository.delete(state.record.id);
      handleBack();
    } catch (err) {
      logger.warn('RecordDetail: delete failed', err);
      Alert.alert('Could not delete', 'Please try again.');
    }
  }, [state.record, handleBack]);

  const handleOverflow = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Delete record', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            void handleDelete();
          }
        },
      );
      return;
    }
    Alert.alert('Record', undefined, [
      { text: 'Delete record', style: 'destructive', onPress: () => void handleDelete() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleDelete]);

  if (state.status === 'loading') {
    return (
      <Surface>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TopBar onBack={handleBack} onOverflow={null} />
          <View style={styles.bodyPad}>
            <DisplayLead style={styles.muted}>Loading…</DisplayLead>
          </View>
        </ScrollView>
      </Surface>
    );
  }

  if (state.status === 'missing' || !state.record) {
    return (
      <Surface>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TopBar onBack={handleBack} onOverflow={null} />
          <View style={styles.bodyPad}>
            <DisplayLead style={styles.muted}>This entry could not be found.</DisplayLead>
          </View>
        </ScrollView>
      </Surface>
    );
  }

  const { record, schema } = state;
  const title = getRecordTitle(record, schema);
  const pairs = getRecordDetailPairs(record, schema);
  const timestamp = formatTimestamp(record.createdAt);
  const photoWidth = width - space.lg * 2;
  const photoHeight = Math.round(photoWidth / PHOTO_ASPECT);

  return (
    <Surface>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TopBar onBack={handleBack} onOverflow={handleOverflow} />

        <View style={styles.hero}>
          <DisplayGrand numberOfLines={2}>{title}</DisplayGrand>
          {timestamp.length > 0 ? (
            <MicroCaps style={styles.timestamp}>{timestamp}</MicroCaps>
          ) : null}
        </View>

        <View style={styles.fields}>
          {pairs.map((pair) => (
            <View key={pair.key} style={styles.fieldRow}>
              <MicroCaps style={styles.fieldLabel}>{pair.label}</MicroCaps>
              <DisplayLead style={styles.fieldValue}>{pair.value}</DisplayLead>
            </View>
          ))}
          {pairs.length === 0 ? <BodyMd style={styles.muted}>No additional fields.</BodyMd> : null}
        </View>

        {record.photoPaths.length > 0 ? (
          <View style={styles.photos}>
            {record.photoPaths.map((uri, idx) => (
              <Image
                key={`${uri}-${idx}`}
                source={{ uri }}
                style={[styles.photo, { width: photoWidth, height: photoHeight }]}
                accessibilityLabel={`Photo ${idx + 1} for ${title}`}
                accessible
              />
            ))}
          </View>
        ) : null}

        {record.audioPath ? (
          <View style={styles.audio}>
            <AudioPlayPill uri={record.audioPath} />
          </View>
        ) : null}
      </ScrollView>
    </Surface>
  );
}

interface TopBarProps {
  onBack: () => void;
  onOverflow: (() => void) | null;
}

function TopBar({ onBack, onOverflow }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={({ pressed }) => [styles.iconButton, pressed ? styles.iconPressed : null]}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={24} color={color.ink} />
      </Pressable>
      {onOverflow ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More actions"
          onPress={onOverflow}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.iconPressed : null]}
          hitSlop={12}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={color.ink} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 160,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    opacity: 0.55,
  },
  hero: {
    paddingTop: space.silence,
    paddingHorizontal: space.lg,
  },
  timestamp: {
    color: color.inkSoft,
    marginTop: space.md,
  },
  fields: {
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
    gap: space.lg,
  },
  fieldRow: {
    gap: space.xs,
  },
  fieldLabel: {
    color: color.inkSoft,
  },
  fieldValue: {
    color: color.ink,
  },
  photos: {
    paddingTop: space.xxl,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  photo: {
    borderRadius: radius.lg,
    backgroundColor: color.cream,
  },
  audio: {
    paddingTop: space.xxl,
    paddingHorizontal: space.lg,
  },
  muted: {
    color: color.inkMuted,
  },
  bodyPad: {
    paddingTop: space.silence,
    paddingHorizontal: space.lg,
  },
});
