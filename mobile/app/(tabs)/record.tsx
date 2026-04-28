import React, { useRef, useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { IconButton, Menu, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { MockTranscriber } from '../../MockTranscriber';
import { LiveChecklist } from '../../components/LiveChecklist';
import { Colors, Fonts } from '../../theme';

type SessionState = 'idle' | 'recording' | 'saved';

export default function RecordScreen() {
  const schemas = useStore((s) => s.schemas);
  const activeSchema = useStore((s) => s.activeSchema);
  const setActiveSchema = useStore((s) => s.setActiveSchema);
  const fieldState = useStore((s) => s.fieldState);
  const resetFieldState = useStore((s) => s.resetFieldState);
  const addRecord = useStore((s) => s.addRecord);
  const setFieldValue = useStore((s) => s.setFieldValue);

  const [session, setSession] = useState<SessionState>('idle');
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);
  const ringAnim = useRef<Animated.CompositeAnimation | null>(null);

  const resolvedCount = Object.values(fieldState).filter((f) => f.resolved).length;
  const totalCount = activeSchema.fields.length;
  const isRecording = session === 'recording';

  useEffect(() => {
    if (isRecording) {
      pulseAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.07, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseAnim.current.start();
      ringAnim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(ring, { toValue: 1, duration: 1000, useNativeDriver: true }),
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

    timerRefs.current = activeSchema.fields.map((field, i) =>
      setTimeout(() => setFieldValue(field.key, MockTranscriber.getFieldValue(field)), i * 700)
    );
  };

  const stopRecording = async () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    const fields: { [key: string]: string } = {};
    for (const [k, v] of Object.entries(fieldState)) {
      if (v.value) fields[k] = v.value;
    }
    await addRecord({
      id: String(Date.now()),
      schemaId: activeSchema.id,
      schemaName: activeSchema.name,
      schemaEmoji: activeSchema.emoji,
      createdAt: new Date().toISOString(),
      fields,
    });
    setSession('saved');
    setTimeout(() => {
      resetFieldState();
      setSession('idle');
    }, 1800);
  };

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.45, 0.2, 0] });

  const btnColor = session === 'saved' ? Colors.done : Colors.primary;
  const btnIcon = session === 'saved' ? '✅' : '🐟';
  const btnLabel = session === 'saved'
    ? 'Saved!'
    : isRecording
    ? 'Release to save'
    : activeSchema.logLabel;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Sub-header */}
      <View style={styles.subHeader}>
        <Text style={styles.schemaTitle}>
          {activeSchema.emoji}  {activeSchema.name}
        </Text>
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              iconColor={Colors.textPrimary}
              size={24}
              onPress={() => setMenuOpen(true)}
              style={styles.menuIcon}
            />
          }
        >
          <Menu.Item title="Switch Schema" disabled style={styles.menuHeader} />
          {schemas.map((s) => (
            <Menu.Item
              key={s.id}
              title={`${s.emoji}  ${s.name}`}
              onPress={() => { setActiveSchema(s); setMenuOpen(false); }}
              leadingIcon={activeSchema.id === s.id ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>

      {/* Field list */}
      <ScrollView style={styles.fieldScroll} contentContainerStyle={styles.fieldContent}>
        {isRecording && resolvedCount > 0 && (
          <Text style={styles.progressLabel}>
            {resolvedCount} / {totalCount} fields heard
          </Text>
        )}
        <LiveChecklist fields={activeSchema.fields} fieldState={fieldState} />
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomArea}>
        <View style={styles.buttonWrap}>
          {isRecording && (
            <Animated.View
              style={[
                styles.ring,
                { backgroundColor: btnColor, transform: [{ scale: ringScale }], opacity: ringOpacity },
              ]}
            />
          )}
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPressIn={session === 'idle' ? startRecording : undefined}
              onPressOut={session === 'recording' ? stopRecording : undefined}
              style={[styles.bigButton, { backgroundColor: btnColor }]}
            >
              <Text style={styles.btnIcon}>{btnIcon}</Text>
              <Text style={styles.btnLabel}>{btnLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
        {session === 'idle' && (
          <Text style={styles.hint}>Hold to speak, release to save</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.paper },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.paperDark,
    backgroundColor: Colors.paper,
  },
  schemaTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  menuIcon: { margin: 0 },
  menuHeader: { opacity: 0.45 },

  fieldScroll: { flex: 1 },
  fieldContent: { padding: 20, paddingBottom: 8 },
  progressLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 12,
  },

  bottomArea: { alignItems: 'center', paddingBottom: 48, paddingTop: 4 },
  buttonWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  bigButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  btnIcon: { fontSize: 46 },
  btnLabel: {
    fontFamily: Fonts.bodyBold,
    color: Colors.white,
    fontSize: 15,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  hint: { marginTop: 12, color: Colors.textMuted, fontSize: 14, fontFamily: Fonts.body },
});
