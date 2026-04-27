import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Button, Text, Surface, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { LiveChecklist } from '../../components/LiveChecklist';
import { SchemaSelector } from '../../components/SchemaSelector';

type SessionState = 'idle' | 'recording' | 'done';

export default function RecordScreen() {
  const theme = useTheme();
  const activeSchema = useStore((s) => s.activeSchema);
  const fieldState = useStore((s) => s.fieldState);
  const resetFieldState = useStore((s) => s.resetFieldState);
  const simulateVoiceFill = useStore((s) => s.simulateVoiceFill);
  const addRecord = useStore((s) => s.addRecord);
  const records = useStore((s) => s.records);

  const [session, setSession] = useState<SessionState>('idle');

  const resolvedCount = Object.values(fieldState).filter((f) => f.resolved).length;
  const totalCount = activeSchema.fields.length;
  const allDone = resolvedCount === totalCount;

  const handleStartRecording = () => {
    resetFieldState();
    setSession('recording');
    simulateVoiceFill();
  };

  const handleDone = () => {
    const fields: { [key: string]: string } = {};
    for (const [k, v] of Object.entries(fieldState)) {
      if (v.value) fields[k] = v.value;
    }
    addRecord({
      id: String(Date.now()),
      schemaId: activeSchema.id,
      schemaName: activeSchema.name,
      schemaEmoji: activeSchema.emoji,
      createdAt: new Date().toISOString(),
      fields,
    });
    setSession('done');
  };

  const handleReset = () => {
    resetFieldState();
    setSession('idle');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SchemaSelector />

        {session === 'idle' && (
          <View style={styles.center}>
            <Pressable
              onPress={handleStartRecording}
              style={({ pressed }) => [
                styles.bigButton,
                { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.micIcon}>🎙️</Text>
              <Text style={styles.bigButtonLabel}>Start Recording</Text>
            </Pressable>
            <Text style={styles.hint}>Say your data aloud. Say "done" when finished.</Text>
          </View>
        )}

        {session === 'recording' && (
          <View>
            <Surface style={styles.listeningBadge} elevation={1}>
              <Text style={styles.listeningText}>● Listening…</Text>
              <Text style={styles.progress}>
                {resolvedCount} / {totalCount} fields filled
              </Text>
            </Surface>

            <LiveChecklist fields={activeSchema.fields} fieldState={fieldState} />

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={handleDone}
                style={styles.doneBtn}
                contentStyle={styles.doneBtnContent}
              >
                Done
              </Button>
              <Button mode="text" onPress={handleReset} textColor="#888">
                Cancel
              </Button>
            </View>
          </View>
        )}

        {session === 'done' && (
          <View style={styles.center}>
            <Text style={styles.successIcon}>✅</Text>
            <Text variant="headlineSmall" style={styles.successText}>
              Record saved!
            </Text>
            <Text style={styles.hint}>
              {activeSchema.emoji} {activeSchema.name} — {new Date().toLocaleTimeString()}
            </Text>
            <Button mode="contained" onPress={handleReset} style={{ marginTop: 24 }}>
              Record Another
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafaf8' },
  scroll: { padding: 20, flexGrow: 1 },
  center: { alignItems: 'center', paddingTop: 24 },
  bigButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  micIcon: { fontSize: 56 },
  bigButtonLabel: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginTop: 8 },
  hint: { color: '#888', marginTop: 16, textAlign: 'center', maxWidth: 280 },
  listeningBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#E8F5E9',
  },
  listeningText: { color: '#2E7D32', fontWeight: '600', fontSize: 15 },
  progress: { color: '#555', fontSize: 13 },
  actions: { marginTop: 28, alignItems: 'center', gap: 8 },
  doneBtn: { width: 200 },
  doneBtnContent: { paddingVertical: 4 },
  successIcon: { fontSize: 72, marginBottom: 16 },
  successText: { fontWeight: 'bold', color: '#2E7D32' },
});
