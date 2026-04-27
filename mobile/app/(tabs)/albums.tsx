import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore, Record } from '../../store';

function RecordCard({ record }: { record: Record }) {
  const router = useRouter();
  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const topFields = Object.entries(record.fields).slice(0, 3);

  return (
    <Card
      style={styles.card}
      onPress={() => router.push(`/record/${record.id}`)}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.emoji}>{record.schemaEmoji}</Text>
          <View style={styles.headerText}>
            <Text variant="titleMedium" style={styles.schemaName}>
              {record.schemaName}
            </Text>
            <Text variant="bodySmall" style={styles.dateText}>
              {dateStr} · {timeStr}
            </Text>
          </View>
        </View>

        <View style={styles.fieldList}>
          {topFields.map(([key, value]) => (
            <View key={key} style={styles.fieldRow}>
              <Text style={styles.fieldKey}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={styles.fieldVal} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
          {Object.keys(record.fields).length > 3 && (
            <Text style={styles.more}>+{Object.keys(record.fields).length - 3} more fields</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

export default function AlbumsScreen() {
  const records = useStore((s) => s.records);

  if (records.length === 0) {
    return (
      <SafeAreaView style={styles.empty} edges={['bottom']}>
        <Text style={styles.emptyIcon}>📂</Text>
        <Text variant="titleMedium" style={{ color: '#888' }}>No records yet</Text>
        <Text style={{ color: '#aaa', marginTop: 8 }}>Head to Record to add your first entry</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RecordCard record={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafaf8' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafaf8' },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  list: { padding: 16 },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: { fontSize: 36, marginRight: 12 },
  headerText: { flex: 1 },
  schemaName: { fontWeight: '700', color: '#1a1a1a' },
  dateText: { color: '#888', marginTop: 2 },
  fieldList: { gap: 6 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldKey: { fontSize: 13, color: '#666', flex: 1 },
  fieldVal: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', flex: 1, textAlign: 'right' },
  more: { color: '#aaa', fontSize: 12, marginTop: 4 },
});
