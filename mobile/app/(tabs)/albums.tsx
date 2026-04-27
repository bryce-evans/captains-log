import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore, Record } from '../../store';
import { Colors, Fonts } from '../../theme';

function RecordCard({ record }: { record: Record }) {
  const router = useRouter();
  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const topFields = Object.entries(record.fields).slice(0, 3);

  return (
    <Card style={styles.card} onPress={() => router.push(`/record/${record.id}`)} mode="elevated">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.emoji}>{record.schemaEmoji}</Text>
          <View style={styles.headerText}>
            <Text style={styles.schemaName}>{record.schemaName}</Text>
            <Text style={styles.dateText}>{dateStr} · {timeStr}</Text>
          </View>
        </View>
        <View style={styles.fieldList}>
          {topFields.map(([key, value]) => (
            <View key={key} style={styles.fieldRow}>
              <Text style={styles.fieldKey}>
                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={styles.fieldVal} numberOfLines={1}>{value}</Text>
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
        <Text style={{ fontSize: 20, color: Colors.textMuted }}>
          No records yet
        </Text>
        <Text style={{ fontSize: 16, color: Colors.textMuted, marginTop: 8 }}>
          Head to Record to add your first entry
        </Text>
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
  safe: { flex: 1, backgroundColor: Colors.paper },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.paper },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  list: { padding: 16 },
  card: { borderRadius: 16, backgroundColor: Colors.white },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 36, marginRight: 12 },
  headerText: { flex: 1 },
  schemaName: { fontSize: 18, fontFamily: 'Galley', color: Colors.textPrimary },
  dateText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  fieldList: { gap: 6 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldKey: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, flex: 1 },
  fieldVal: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  more: { fontFamily: Fonts.body, color: Colors.textMuted, fontSize: 13, marginTop: 4 },
});
