import React from 'react';
import { Alert, ScrollView, StyleSheet, View, Image } from 'react-native';
import { Button, Text, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../store';

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const record = useStore((s) => s.records.find((r) => r.id === id));
  const deleteRecord = useStore((s) => s.deleteRecord);

  const handleDelete = () => {
    Alert.alert('Delete Record', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteRecord(id!); router.back(); },
      },
    ]);
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
          <Text variant="headlineMedium" style={styles.heroTitle}>
            {record.schemaName}
          </Text>
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
          onPress={handleDelete}
          style={styles.deleteBtn}
          labelStyle={styles.deleteBtnLabel}
          textColor="#c0392b"
        >
          Delete Record
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafaf8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20 },
  hero: { alignItems: 'center', marginBottom: 24, paddingVertical: 16 },
  heroEmoji: { fontSize: 64, marginBottom: 8 },
  heroTitle: { fontWeight: '700', color: '#1a1a1a' },
  heroDate: { color: '#555', marginTop: 4 },
  heroTime: { color: '#888', fontSize: 13 },
  card: {
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  fieldKey: { color: '#666', fontSize: 14, flex: 1 },
  fieldVal: { fontWeight: '600', color: '#1a1a1a', fontSize: 14, flex: 1, textAlign: 'right' },
  photoCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  photo: { width: '100%', height: 240 },
  noPhoto: { alignItems: 'center', padding: 24 },
  noPhotoText: { color: '#bbb', fontSize: 14 },
  deleteBtn: { marginTop: 8, marginBottom: 32, borderColor: '#c0392b' },
  deleteBtnLabel: { fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
});
