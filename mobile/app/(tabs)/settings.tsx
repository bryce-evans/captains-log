import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useStore } from '../../store';
import { Colors, Fonts } from '../../theme';

function Row({
  icon, label, value, onPress,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, onPress && pressed && styles.rowPressed]}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color={Colors.primary} style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value !== undefined
        ? <Text style={styles.rowValue}>{value}</Text>
        : onPress && <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
      }
    </Pressable>
  );
}

export default function SettingsScreen() {
  const records = useStore((s) => s.records);
  const schemas = useStore((s) => s.schemas);

  const handleExport = async () => {
    if (Platform.OS === 'web') return;

    const payload = {
      exportedAt: new Date().toISOString(),
      schemas: schemas.map((s) => ({ id: s.id, name: s.name, fields: s.fields.map((f) => f.key) })),
      records: records.map((r) => ({
        id: r.id,
        schema: r.schemaName,
        date: r.createdAt,
        fields: r.fields,
      })),
    };

    const path = FileSystem.cacheDirectory + 'captains_log_export.json';
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: "Export Captain's Log" });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.profileHeader}>
          <View style={styles.profileIcon}>
            <MaterialCommunityIcons name="fish" size={36} color={Colors.white} />
          </View>
          <Text style={styles.profileName}>Captain's Log</Text>
          <Text style={styles.profileSub}>Your personal fishing journal</Text>
        </View>

        <Text style={styles.sectionLabel}>Stats</Text>
        <Surface style={styles.card} elevation={1}>
          <Row icon="counter" label="Total Records" value={String(records.length)} />
          <Divider />
          <Row icon="book-open-variant" label="Active Schemas" value={String(schemas.length)} />
        </Surface>

        <Text style={styles.sectionLabel}>Schemas</Text>
        <Surface style={styles.card} elevation={1}>
          {schemas.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <Divider />}
              <Row
                icon="table"
                label={`${s.emoji}  ${s.name}`}
                value={`${s.fields.length} fields`}
              />
            </React.Fragment>
          ))}
        </Surface>

        <Text style={styles.sectionLabel}>Data</Text>
        <Surface style={styles.card} elevation={1}>
          <Row
            icon="download"
            label="Export All Data"
            onPress={handleExport}
          />
        </Surface>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },
  scroll: { padding: 20, paddingBottom: 40 },

  profileHeader: { alignItems: 'center', marginBottom: 32, paddingTop: 8 },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: { fontFamily: Fonts.heading, fontSize: 26, color: Colors.textPrimary },
  profileSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.textMuted, marginTop: 4 },

  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 24,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: Colors.paperDark },
  rowIcon: { marginRight: 12 },
  rowLabel: { fontFamily: Fonts.body, fontSize: 15, color: Colors.textPrimary, flex: 1 },
  rowValue: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.textMuted },
});
