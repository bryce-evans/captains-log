import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { v4 as uuidv4 } from 'uuid';

import { FieldEditModal } from '@/components/checklist/FieldEditModal';
import { LiveChecklist } from '@/components/checklist/LiveChecklist';
import { PhotoAttachButton } from '@/components/photo/PhotoAttachButton';
import { BigButton, Surface, ToastQuiet, type BigButtonState } from '@/components/primitives';
import { ReviewModal } from '@/components/review/ReviewModal';
import { SchemaSelectorSheet } from '@/components/schema/SchemaSelectorSheet';
import { BodyMd, DisplayHead, MicroCaps } from '@/components/type';
import { SchemaRepository } from '@/db/SchemaRepository';
import type { SchemaField } from '@/db/schema';
import { autoFill } from '@/services/AutoFillService';
import { ExtractionRetryQueue } from '@/services/ExtractionRetryQueue';
import { pathForAudio } from '@/storage/FileStorageService';
import { selectActiveSchema, useStore } from '@/store';
import { color, motion, space } from '@/styles/tokens';
import { ExtractionNetworkError, getFieldExtractor, getWhisperService } from '@/voice';
import {
  VoiceSession,
  type VoiceSessionStatus,
  type FieldRejectionEvent,
  type FieldUpdateEvent,
} from '@/voice';
import { createMicService } from '@/voice/mic';

const REJECT_HOLD_MS = 280;

interface ToastState {
  readonly message: string;
  readonly key: number;
}

/**
 * The Journal (Record) tab — the home of the app. Coordinates the voice
 * session, live checklist, photo attach, schema selection, and review
 * modal. Lifts the Voice/Whisper/extractor singletons lazily so that
 * cold-launch latency lands on the first record press, not at app start.
 */
export default function JournalScreen() {
  const activeSchema = useStore(selectActiveSchema);
  const hydrateActiveSchema = useStore((state) => state.hydrateActiveSchema);
  const clearDraft = useStore((state) => state.clearDraft);
  const setField = useStore((state) => state.setField);
  const markDone = useStore((state) => state.markDone);
  const forceMarkDone = useStore((state) => state.forceMarkDone);
  const draftHasContent = useStore((state) => Object.keys(state.draft).length > 0);

  const insets = useSafeAreaInsets();
  // Tab bar pill bottom: insets.bottom + space.lg (~58pt on iPhone 16 Pro)
  // Tab bar pill height: ~64pt (DisplayLead + paddings)
  // Need ~48pt of breathing room between BigButton bottom and pill top.
  const TAB_BAR_PILL_HEIGHT = 64;
  const TAB_BAR_GAP_ABOVE = 48;
  const controlsBottom = insets.bottom + space.lg + TAB_BAR_PILL_HEIGHT + TAB_BAR_GAP_ABOVE;

  const [draftId, setDraftId] = useState<string>(() => uuidv4());
  const [photoPaths, setPhotoPaths] = useState<ReadonlyArray<string>>([]);
  const [sessionStatus, setSessionStatus] = useState<VoiceSessionStatus>('idle');
  const [activeFieldKey, setActiveFieldKey] = useState<string | undefined>(undefined);
  const [rejectingFieldKey, setRejectingFieldKey] = useState<string | undefined>(undefined);
  const [warmingUp, setWarmingUp] = useState<boolean>(false);
  const [reviewFields, setReviewFields] = useState<ReadonlyArray<SchemaField>>([]);
  const [reviewVisible, setReviewVisible] = useState<boolean>(false);
  const [selectorVisible, setSelectorVisible] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [editingField, setEditingField] = useState<SchemaField | null>(null);

  const sessionRef = useRef<VoiceSession | null>(null);
  const rejectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTint = useSharedValue<number>(0);

  useEffect(() => {
    void hydrateActiveSchema();
  }, [hydrateActiveSchema]);

  useEffect(() => {
    const extractor = getFieldExtractor();
    const unsubscribe = ExtractionRetryQueue.subscribeToConnectivity(extractor, SchemaRepository);
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      if (rejectingTimerRef.current) {
        clearTimeout(rejectingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    recordingTint.value = withTiming(sessionStatus === 'listening' ? 1 : 0, {
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [sessionStatus, recordingTint]);

  const tintStyle = useAnimatedStyle(() => ({
    opacity: recordingTint.value,
  }));

  const buttonState = useMemo<BigButtonState>(() => {
    if (sessionStatus === 'listening' || sessionStatus === 'processing') {
      return 'recording';
    }
    if (sessionStatus === 'starting') {
      return 'pressed';
    }
    if (sessionStatus === 'finalizing') {
      return 'review';
    }
    return 'idle';
  }, [sessionStatus]);

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() });
  }, []);

  const flashRejection = useCallback((key: string) => {
    setRejectingFieldKey(key);
    if (rejectingTimerRef.current) {
      clearTimeout(rejectingTimerRef.current);
    }
    rejectingTimerRef.current = setTimeout(() => {
      setRejectingFieldKey(undefined);
      rejectingTimerRef.current = null;
    }, REJECT_HOLD_MS);
  }, []);

  const applyAutoFill = useCallback(async (): Promise<void> => {
    const schema = useStore.getState().activeSchema;
    if (!schema) {
      return;
    }
    try {
      const result = await autoFill();
      const setters = useStore.getState().setField;
      const fieldKeys = new Set(schema.fields.map((f) => f.key));
      if (fieldKeys.has('timestamp')) {
        setters('timestamp', result.timestamp);
      }
      if (result.location) {
        if (fieldKeys.has('location')) {
          const place =
            result.location.place ??
            `${result.location.latitude.toFixed(3)}, ${result.location.longitude.toFixed(3)}`;
          setters('location', place);
        }
      }
      if (result.weather) {
        if (fieldKeys.has('weather')) {
          setters('weather', result.weather.conditions);
        }
        if (fieldKeys.has('temperature')) {
          setters('temperature', result.weather.tempC);
        }
      }
    } catch {
      // Auto-fill is best-effort; never block the record.
    }
  }, []);

  const teardownSession = useCallback(() => {
    sessionRef.current = null;
    setActiveFieldKey(undefined);
    setSessionStatus('idle');
  }, []);

  const startVoiceSession = useCallback(async (): Promise<void> => {
    if (sessionRef.current) {
      return;
    }
    if (!activeSchema) {
      return;
    }

    const mic = createMicService();
    let permissionGranted = false;
    try {
      permissionGranted = await mic.requestPermission();
    } catch {
      showToast('Microphone permission required.');
      return;
    }
    if (!permissionGranted) {
      showToast('Microphone permission required.');
      return;
    }

    void applyAutoFill();

    const whisper = getWhisperService();
    if (!whisper.isReady()) {
      setWarmingUp(true);
      try {
        await whisper.initialize();
      } catch {
        setWarmingUp(false);
        showToast('Voice unavailable — try again.');
        return;
      }
      setWarmingUp(false);
    }

    const extractor = getFieldExtractor();
    // Capture schema/setField/markDone at session-start so a mid-session
    // schema switch in another part of the app cannot corrupt this draft.
    const session = new VoiceSession({
      mic,
      whisper,
      extractor,
      schema: activeSchema,
      setField,
      markDone,
      clearDraft,
    });
    sessionRef.current = session;

    session.on('status', (status) => {
      setSessionStatus(status);
    });
    session.on('fieldUpdate', (event: FieldUpdateEvent) => {
      setActiveFieldKey(event.key);
    });
    session.on('rejected', (event: FieldRejectionEvent) => {
      flashRejection(event.key);
    });
    session.on('partial', () => {
      // Partial transcripts hint that the user is speaking; we don't have
      // per-field targeting from whisper, so we only clear the listening
      // marker once a field actually fills.
    });
    session.on('error', (err: Error) => {
      if (err instanceof ExtractionNetworkError) {
        const finals = useStore.getState().final;
        const transcriptSnapshot = finals.length > 0 ? (finals[finals.length - 1] ?? '') : '';
        const schemaId = activeSchema.id;
        if (transcriptSnapshot && schemaId) {
          void ExtractionRetryQueue.enqueue(transcriptSnapshot, schemaId);
        }
        showToast('Queued — will retry when online.');
        return;
      }
      showToast('Something went wrong. Try again.');
    });
    session.on('needsReview', ({ emptyImportantKeys }) => {
      const fields = activeSchema.fields.filter((f) => emptyImportantKeys.includes(f.key));
      setReviewFields(fields);
      setReviewVisible(true);
    });
    session.on('completed', () => {
      showToast('Saved.');
      setPhotoPaths([]);
      setDraftId(uuidv4());
      teardownSession();
    });

    try {
      await session.start({
        audioPath: pathForAudio(draftId),
        photoPaths,
      });
    } catch {
      teardownSession();
      showToast('Could not start recording.');
    }
  }, [
    activeSchema,
    applyAutoFill,
    clearDraft,
    draftId,
    flashRejection,
    markDone,
    photoPaths,
    setField,
    showToast,
    teardownSession,
  ]);

  const stopVoiceSession = useCallback(async (): Promise<void> => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }
    try {
      await session.stop();
    } catch {
      // Best-effort; finalize will report errors via `error` event.
    }
  }, []);

  const cancelVoiceSession = useCallback(async (): Promise<void> => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }
    try {
      await session.cancel();
    } finally {
      teardownSession();
    }
  }, [teardownSession]);

  const handleBigButtonPress = useCallback(() => {
    if (sessionRef.current && sessionStatus !== 'idle' && sessionStatus !== 'done') {
      void stopVoiceSession();
      return;
    }
    void startVoiceSession();
  }, [sessionStatus, startVoiceSession, stopVoiceSession]);

  const handleSaveAnyway = useCallback(async (): Promise<void> => {
    try {
      await forceMarkDone({
        audioPath: pathForAudio(draftId),
        photoPaths,
      });
      setReviewVisible(false);
      setReviewFields([]);
      setPhotoPaths([]);
      setDraftId(uuidv4());
      showToast('Saved.');
    } catch {
      showToast('Could not save.');
    }
  }, [draftId, forceMarkDone, photoPaths, showToast]);

  const handleAddByVoice = useCallback(() => {
    setReviewVisible(false);
    void startVoiceSession();
  }, [startVoiceSession]);

  const handleReviewCancel = useCallback(() => {
    setReviewVisible(false);
  }, []);

  const handlePhotoPicked = useCallback((path: string) => {
    setPhotoPaths((prev) => [...prev, path]);
  }, []);

  const handleSelectorOpen = useCallback(() => {
    if (sessionRef.current) {
      return;
    }
    setSelectorVisible(true);
  }, []);

  const handleSelectorClose = useCallback(() => {
    setSelectorVisible(false);
  }, []);

  const handleToastDismiss = useCallback(() => {
    setToast(null);
  }, []);

  const handleClearDraft = useCallback(() => {
    if (sessionRef.current) {
      return;
    }
    clearDraft();
    setPhotoPaths([]);
    setDraftId(uuidv4());
  }, [clearDraft]);

  const importantCount = activeSchema?.fields.filter((f) => f.important).length ?? 0;
  const totalFields = activeSchema?.fields.length ?? 0;
  const isRecording = sessionStatus === 'listening' || sessionStatus === 'processing';

  return (
    <Surface>
      <Animated.View
        pointerEvents="none"
        style={[styles.recordingTint, tintStyle]}
        accessibilityElementsHidden
      />
      <ScrollView
        style={{ marginBottom: controlsBottom + 168 - 24 }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch schema. Current: ${activeSchema?.name ?? 'none'}`}
            onPress={handleSelectorOpen}
          >
            <DisplayHead>{activeSchema?.name ?? 'Choose a log'}</DisplayHead>
          </Pressable>
          <MicroCaps style={styles.subtitle}>
            {activeSchema
              ? `${totalFields} fields · ${importantCount} important`
              : 'Tap to choose a log'}
          </MicroCaps>
        </View>

        <View style={styles.checklist}>
          <LiveChecklist
            activeFieldKey={activeFieldKey}
            rejectingFieldKey={rejectingFieldKey}
            onFieldPress={(field) => {
              if (sessionRef.current) {
                return;
              }
              setEditingField(field);
            }}
          />
        </View>

        {photoPaths.length > 0 ? (
          <MicroCaps style={styles.photoCount}>{`${photoPaths.length} photo${
            photoPaths.length === 1 ? '' : 's'
          } attached`}</MicroCaps>
        ) : null}
      </ScrollView>

      <View style={[styles.controls, { bottom: controlsBottom }]}>
        {warmingUp ? <MicroCaps style={styles.warmup}>warming up…</MicroCaps> : null}
        <View style={styles.buttonRow}>
          <View style={styles.photoSlot}>
            {!isRecording ? (
              <PhotoAttachButton
                recordId={draftId}
                existingCount={photoPaths.length}
                onPicked={handlePhotoPicked}
              />
            ) : null}
          </View>
          <BigButton state={buttonState} onPress={handleBigButtonPress} />
          <View style={styles.photoSlot} />
        </View>
        {isRecording ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel recording"
            onPress={() => {
              void cancelVoiceSession();
            }}
            style={styles.cancelButton}
          >
            <BodyMd style={styles.cancelLabel}>Cancel</BodyMd>
          </Pressable>
        ) : null}
        {!isRecording && draftHasContent ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard draft"
            onPress={handleClearDraft}
            style={styles.cancelButton}
          >
            <MicroCaps style={styles.cancelLabel}>Discard draft</MicroCaps>
          </Pressable>
        ) : null}
      </View>

      <FieldEditModal
        visible={editingField !== null}
        field={editingField}
        initialValue={editingField ? useStore.getState().draft[editingField.key] : undefined}
        onSave={(key, value) => {
          setField(key, value);
          setEditingField(null);
        }}
        onClear={(key) => {
          setField(key, '');
          setEditingField(null);
        }}
        onCancel={() => setEditingField(null)}
      />
      <SchemaSelectorSheet visible={selectorVisible} onClose={handleSelectorClose} />
      <ReviewModal
        visible={reviewVisible}
        emptyFields={reviewFields}
        onSaveAnyway={handleSaveAnyway}
        onAddByVoice={handleAddByVoice}
        onCancel={handleReviewCancel}
      />
      {toast ? (
        <ToastQuiet
          key={toast.key}
          message={toast.message}
          visible={toast !== null}
          onDismiss={handleToastDismiss}
        />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  recordingTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.emberWash,
  },
  scrollContent: {
    paddingTop: space.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  header: {
    gap: space.xs,
  },
  subtitle: {
    color: color.inkSoft,
    marginTop: space.sm,
  },
  checklist: {
    marginTop: space.xs,
  },
  photoCount: {
    color: color.inkSoft,
    marginTop: space.sm,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: space.md,
  },
  warmup: {
    color: color.inkSoft,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  photoSlot: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  cancelLabel: {
    color: color.inkMuted,
  },
});
