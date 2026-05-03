import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BodyMd, DisplayHero, MicroCaps } from '@/components/type';
import type { RecordRow, Schema } from '@/db/schema';
import { color, elevation, radius, space } from '@/styles/tokens';
import { formatTimestamp, getRecordSubtitle, getRecordTitle } from '@/utils/formatRecord';

interface Props {
  record: RecordRow;
  schema: Schema | null;
  onPress: (recordId: string) => void;
  isLastInGroup?: boolean;
}

const PHOTO_WIDTH_RATIO = 0.56;
const PHOTO_ASPECT = 4 / 3;

/**
 * One entry on the Albums screen. Type-led — the species/title is the
 * largest thing in the row. A short hairline divider (40% width, left
 * aligned, mist) separates entries within a group; we only render it when
 * the entry isn't the last one in its month-group.
 */
export function AlbumEntry({ record, schema, onPress, isLastInGroup = false }: Props) {
  const { width } = useWindowDimensions();
  const title = getRecordTitle(record, schema);
  const subtitle = getRecordSubtitle(record, schema);
  const timestamp = formatTimestamp(record.createdAt);
  const photoUri = record.photoPaths[0];
  const photoWidth = Math.round(width * PHOTO_WIDTH_RATIO);
  const photoHeight = Math.round(photoWidth / PHOTO_ASPECT);

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}`}
        onPress={() => onPress(record.id)}
        style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}
      >
        <DisplayHero numberOfLines={2} style={styles.title}>
          {title}
        </DisplayHero>
        {subtitle.length > 0 ? (
          <BodyMd style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </BodyMd>
        ) : null}
        <MicroCaps style={styles.timestamp}>{timestamp}</MicroCaps>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[styles.photo, elevation.rest, { width: photoWidth, height: photoHeight }]}
            accessibilityLabel={`Photo for ${title}`}
            accessible
          />
        ) : null}
      </Pressable>
      {isLastInGroup ? null : <View style={styles.divider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: space.lg,
  },
  pressable: {
    paddingVertical: space.lg,
  },
  pressed: {
    opacity: 0.65,
  },
  title: {
    color: color.ink,
  },
  subtitle: {
    color: color.inkMuted,
    marginTop: space.sm,
  },
  timestamp: {
    color: color.inkSoft,
    marginTop: space.xs,
  },
  photo: {
    marginTop: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.cream,
  },
  divider: {
    height: 1,
    width: '40%',
    backgroundColor: color.mist,
  },
});
