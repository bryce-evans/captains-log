import React, { useRef, useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { LiveChecklist } from '../../components/LiveChecklist';
import { SchemaSelector } from '../../components/SchemaSelector';

type SessionState = 'idle' | 'recording' | 'saved';

export default function RecordScreen() {
  const activeSchema = useStore((s) => s.activeSchema);
  const fieldState = useStore((s) => s.fieldState);
  const resetFieldState = useStore((s) => s.resetFieldState);
  const addRecord = useStore((s) => s.addRecord);
  const setFieldValue = useStore((s) => s.setFieldValue);

  const [session, setSession] = useState<SessionState>('idle');
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Pulse animation while recording
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Ring ripple
  const ring = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef<Animated.CompositeAnimation | null>(null);

  const resolvedCount = Object.values(fieldState).filter((f) => f.resolved).length;
  const totalCount = activeSchema.fields.length;
  const isRecording = session === 'recording';

  useEffect(() => {
    if (isRecording) {
      pulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseAnim.current.start();

      ringAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      ringAnim.current.start();
    } else {
      pulseAnim.current?.stop();
      ringAnim.current?.stop();
      pulse.setValue(1);
      ring.setValue(0);
    }
  }, [isRecording]);

  const startRecording = () => {
    resetFieldState();
    setSession('recording');

    const mockValues: { [key: string]: string } = {
      species: 'Smallmouth Bass',
      weight_lbs: '3.1',
      length_in: '16',
      lure: 'Jig',
      location: 'Seneca Lake',
      time: new Date().toLocaleTimeString(),
      weather: 'Sunny, 72°F',
      notes: 'Near the dock',
      item: 'Abstract acrylic #12',
      price: '85',
      payment: 'Card',
      buyer_name: 'Alex T.',
    };

    timerRefs.current = activeSchema.fields.map((field, i) => {
      return setTimeout(() => {
        setFieldValue(field.key, mockValues[field.key] ?? 'N/A');
      }, i * 700);
    });
  };

  const stopRecording = () => {
    // Cancel any pending mock fills
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    // Save whatever is resolved
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
    setSession('saved');
    setTimeout(() => setSession('idle'), 2000);
  };

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.3, 0] });

  const buttonColor = session === 'saved' ? '#4CAF50' : '#1B5E20';
  const buttonIcon = session === 'saved' ? '✅' : '🎙️';
  const buttonLabel =
    session === 'saved' ? 'Saved!' : isRecording ? 'Release to save' : 'Hold to Record';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SchemaSelector />

        <View style={styles.center}>
          {/* Ripple ring behind button */}
          <View style={styles.buttonWrap}>
            {isRecording && (
              <Animated.View
                style={[
                  styles.ring,
                  { backgroundColor: buttonColor, transform: [{ scale: ringScale }], opacity: ringOpacity },
                ]}
              />
            )}
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable
                onPressIn={session === 'idle' ? startRecording : undefined}
                onPressOut={session === 'recording' ? stopRecording : undefined}
                style={[styles.bigButton, { backgroundColor: buttonColor }]}
              >
                <Text style={styles.micIcon}>{buttonIcon}</Text>
                <Text style={styles.bigButtonLabel}>{buttonLabel}</Text>
              </Pressable>
            </Animated.View>
          </View>

          {!isRecording && session === 'idle' && (
            <Text style={styles.hint}>Hold the button and speak your record</Text>
          )}

          {isRecording && (
            <Text style={styles.progressText}>
              {resolvedCount} / {totalCount} fields heard
            </Text>
          )}
        </View>

        {(isRecording || session === 'saved') && resolvedCount > 0 && (
          <Surface style={styles.checklistCard} elevation={1}>
            <LiveChecklist fields={activeSchema.fields} fieldState={fieldState} />
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafaf8' },
  scroll: { padding: 20, flexGrow: 1 },
  center: { alignItems: 'center', paddingTop: 32, paddingBottom: 24 },
  buttonWrap: { alignItems: 'center', justifyContent: 'center', width: 200, height: 200 },
  ring: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  bigButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  micIcon: { fontSize: 56 },
  bigButtonLabel: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginTop: 6, textAlign: 'center' },
  hint: { color: '#888', marginTop: 20, textAlign: 'center', maxWidth: 260 },
  progressText: { marginTop: 16, color: '#2E7D32', fontWeight: '600', fontSize: 15 },
  checklistCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fff',
  },
});
