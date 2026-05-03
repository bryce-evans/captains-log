import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AlbumEntry } from '@/components/album/AlbumEntry';
import { AlbumGroupHeader } from '@/components/album/AlbumGroupHeader';
import { Surface } from '@/components/primitives';
import { DisplayHead, DisplayLead, MicroCaps } from '@/components/type';
import { RecordRepository } from '@/db/RecordRepository';
import type { RecordRow } from '@/db/schema';
import { selectActiveSchema, useStore } from '@/store';
import { color, space } from '@/styles/tokens';
import { groupByMonth } from '@/utils/formatRecord';
import { logger } from '@/utils/logger';

/**
 * The Logbook (Albums) tab — a journal of past records. Type-led, no card
 * chrome; entries are separated by short hairline dividers and grouped by
 * month. Refreshes on tab focus so newly-saved records appear without a
 * pull-to-refresh dance.
 *
 * DESIGN.md: "Albums" — Fraunces head title, MicroCaps subtitle, breath
 * margin between months, photos at 56% screen width.
 */
export default function LogbookIndexScreen() {
  const router = useRouter();
  const activeSchema = useStore(selectActiveSchema);
  const [records, setRecords] = useState<readonly RecordRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        if (!activeSchema) {
          if (active) {
            setRecords([]);
            setIsLoading(false);
          }
          return;
        }
        try {
          const next = await RecordRepository.findBySchema(activeSchema.id);
          if (active) {
            setRecords(Object.freeze([...next]));
          }
        } catch (err) {
          if (active) {
            setRecords([]);
          }
          logger.warn('Logbook: failed to load records', err);
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      }
      setIsLoading(true);
      void load();
      return () => {
        active = false;
      };
    }, [activeSchema]),
  );

  const groups = useMemo(() => groupByMonth(records), [records]);
  const handleSelect = useCallback(
    (recordId: string) => {
      router.push({ pathname: '/(tabs)/logbook/[id]', params: { id: recordId } });
    },
    [router],
  );

  const subtitle = activeSchema
    ? `${activeSchema.name} · ${records.length} ${records.length === 1 ? 'entry' : 'entries'}`
    : 'No schema selected';

  return (
    <Surface>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <DisplayHead>Logbook</DisplayHead>
          <MicroCaps style={styles.subtitle}>{subtitle}</MicroCaps>
        </View>

        {!isLoading && records.length === 0 ? (
          <View style={styles.empty}>
            <DisplayLead style={styles.emptyText}>
              Nothing logged yet. Press record on the journal tab to begin.
            </DisplayLead>
          </View>
        ) : null}

        {groups.map((group) => (
          <View key={group.key}>
            <AlbumGroupHeader label={group.label} />
            {group.records.map((record, index) => (
              <AlbumEntry
                key={record.id}
                record={record}
                schema={activeSchema}
                onPress={handleSelect}
                isLastInGroup={index === group.records.length - 1}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 160,
  },
  header: {
    paddingTop: space.silence,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  subtitle: {
    color: color.inkSoft,
    marginTop: space.sm,
  },
  empty: {
    paddingHorizontal: space.lg,
    paddingTop: space.xxl,
  },
  emptyText: {
    color: color.inkMuted,
  },
});
