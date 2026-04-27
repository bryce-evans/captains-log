import React from 'react';
import { FlatList, ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore, Record, Schema } from '../../store';
import { Colors, Fonts } from '../../theme';
import { getSpeciesImage } from '../../assets/species';

const UNIT: { [key: string]: string } = {
  weight_lbs: 'lbs',
  length_in: 'in',
};

function formatStat(key: string, value: string): string {
  const unit = UNIT[key];
  return unit ? `${value} ${unit}` : value;
}

function RecordCard({ record, schema }: { record: Record; schema: Schema | undefined }) {
  const router = useRouter();
  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const importantFields = schema?.fields.filter((f) => f.important) ?? [];
  const titleField = importantFields[0];
  const statFields = importantFields.slice(1);

  const title = titleField ? (record.fields[titleField.key] ?? record.schemaName) : record.schemaName;
  const stats = statFields
    .map((f) => record.fields[f.key] ? formatStat(f.key, record.fields[f.key]) : null)
    .filter(Boolean) as string[];

  const speciesImage = getSpeciesImage(title);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/record/${record.id}`)}
    >
      <ImageBackground
        source={speciesImage ?? undefined}
        style={styles.cardBg}
        imageStyle={styles.cardBgImage}
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.date}>{dateStr}</Text>
          <Text style={styles.title}>{title}</Text>
          {stats.length > 0 && (
            <View style={styles.statsRow}>
              {stats.map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Text style={styles.statDot}>·</Text>}
                  <Text style={styles.stat}>{s}</Text>
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ImageBackground>
    </Pressable>
  );
}

export default function AlbumsScreen() {
  const records = useStore((s) => s.records);
  const schemas = useStore((s) => s.schemas);

  if (records.length === 0) {
    return (
      <SafeAreaView style={styles.empty} edges={['bottom']}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text style={styles.emptyTitle}>No records yet</Text>
        <Text style={styles.emptyHint}>Head to Record to log your first catch</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RecordCard record={item} schema={schemas.find((s) => s.id === item.schemaId)} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontFamily: Fonts.bodyBold, color: Colors.textMuted },
  emptyHint: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 8 },

  list: { padding: 16 },
  separator: { height: 10 },

  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPressed: { opacity: 0.8 },

  cardBg: { width: '100%' },
  cardBgImage: { resizeMode: 'cover', opacity: 0.55 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primaryDark,
    opacity: 0.55,
  },

  content: { paddingHorizontal: 20, paddingVertical: 18 },
  date: { fontFamily: Fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  title: { fontFamily: Fonts.heading, fontSize: 28, color: Colors.white, marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { fontFamily: Fonts.bodyBold, fontSize: 16, color: Colors.white },
  statDot: { fontFamily: Fonts.body, fontSize: 16, color: 'rgba(255,255,255,0.6)' },
});
