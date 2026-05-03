import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { PulsingEllipsis, StreamingAnswer } from '@/components/answer/StreamingAnswer';
import { BigButton, Surface, type BigButtonState } from '@/components/primitives';
import { BodyMd, DisplayHead, DisplayLead, MicroCaps } from '@/components/type';
import { getAIQueryEngine } from '@/ai';
import {
  AIQueryNetworkError,
  AIQueryTimeoutError,
  AIQueryMalformedError,
  UnsafeQueryError,
} from '@/ai/types';
import {
  QueryVoiceSession,
  WhisperUnavailableError,
  createMicService,
  createTTSService,
  getWhisperService,
} from '@/voice';
import { selectActiveSchema, useStore } from '@/store';
import { color, radius, space } from '@/styles/tokens';
import { logger } from '@/utils/logger';

type Phase = 'idle' | 'recording' | 'processing' | 'ready' | 'warmup' | 'error';

interface AskState {
  question: string;
  answer: string;
  phase: Phase;
  errorMessage: string | null;
}

const COMPACT_TARGET_PX = 96;
const BIG_BUTTON_IDLE_PX = 168;
const COMPACT_SCALE = COMPACT_TARGET_PX / BIG_BUTTON_IDLE_PX;

const ERROR_COPY = {
  network: 'Couldn’t reach the answer service. Check your connection and try again.',
  timeout: 'That took longer than expected. Please try again.',
  malformed: 'The answer came back malformed. Try rephrasing your question.',
  unsafeSql: "We didn't run that — the generated query wasn't safe.",
  whisper: 'Voice transcription is unavailable. Type your question instead.',
  generic: 'Something went sideways. Please try again.',
} as const;

function describeError(err: unknown): string {
  if (err instanceof AIQueryNetworkError) return ERROR_COPY.network;
  if (err instanceof AIQueryTimeoutError) return ERROR_COPY.timeout;
  if (err instanceof AIQueryMalformedError) return ERROR_COPY.malformed;
  if (err instanceof UnsafeQueryError) return ERROR_COPY.unsafeSql;
  if (err instanceof WhisperUnavailableError) return ERROR_COPY.whisper;
  return ERROR_COPY.generic;
}

export default function AskScreen() {
  const activeSchema = useStore(selectActiveSchema);
  const ttsRef = useRef<ReturnType<typeof createTTSService> | null>(null);
  if (!ttsRef.current) {
    ttsRef.current = createTTSService();
  }

  const sessionRef = useRef<QueryVoiceSession | null>(null);
  const hasWarmedRef = useRef<boolean>(false);
  const [textInputValue, setTextInputValue] = useState<string>('');
  const [state, setState] = useState<AskState>({
    question: '',
    answer: '',
    phase: 'idle',
    errorMessage: null,
  });

  const buildSession = useCallback((): QueryVoiceSession => {
    if (sessionRef.current) {
      return sessionRef.current;
    }
    const engine = getAIQueryEngine();
    const adapter = {
      answer: async (question: string) => {
        const result = await engine.answer({ question, activeSchema });
        return {
          text: result.text,
          sql: result.sql ?? undefined,
          rows: [...result.rows] as unknown[],
        };
      },
    };
    sessionRef.current = new QueryVoiceSession({
      mic: createMicService(),
      whisper: getWhisperService(),
      aiQueryEngine: adapter,
      tts: ttsRef.current ?? createTTSService(),
    });
    return sessionRef.current;
  }, [activeSchema]);

  // Reset session when schema changes — the AI engine is bound by closure to
  // the current schema, so we re-build to pick up the new context.
  useEffect(() => {
    sessionRef.current = null;
  }, [activeSchema]);

  const speakAgain = useCallback(async () => {
    if (!state.answer || !ttsRef.current) {
      return;
    }
    try {
      await ttsRef.current.speak(state.answer);
    } catch (err) {
      logger.warn('Ask: TTS replay failed', err);
    }
  }, [state.answer]);

  const submitTextQuery = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return;
      }
      Keyboard.dismiss();
      setState({ question: trimmed, answer: '', phase: 'processing', errorMessage: null });
      try {
        const engine = getAIQueryEngine();
        const result = await engine.answer({ question: trimmed, activeSchema });
        setState({
          question: trimmed,
          answer: result.text,
          phase: 'ready',
          errorMessage: null,
        });
        if (ttsRef.current) {
          void ttsRef.current.speak(result.text).catch(() => undefined);
        }
      } catch (err) {
        setState({
          question: trimmed,
          answer: '',
          phase: 'error',
          errorMessage: describeError(err),
        });
        logger.warn('Ask: text query failed', err);
      }
    },
    [activeSchema],
  );

  const startVoice = useCallback(async () => {
    try {
      const session = buildSession();
      const isFirst = !hasWarmedRef.current;
      hasWarmedRef.current = true;
      setState((prev) => ({
        ...prev,
        phase: isFirst ? 'warmup' : 'recording',
        errorMessage: null,
      }));
      // Brief warm-up phase visualizes the Whisper init; we then transition
      // into recording on the next tap. The session itself handles initialize().
      await session.startListening();
      if (isFirst) {
        setTimeout(() => {
          setState((prev) => (prev.phase === 'warmup' ? { ...prev, phase: 'recording' } : prev));
        }, 600);
      } else {
        setState((prev) => ({ ...prev, phase: 'recording', errorMessage: null }));
      }
    } catch (err) {
      setState({
        question: '',
        answer: '',
        phase: 'error',
        errorMessage: describeError(err),
      });
      logger.warn('Ask: voice query failed', err);
    }
  }, [buildSession]);

  const stopVoice = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) {
      return;
    }
    setState((prev) => ({ ...prev, phase: 'processing', errorMessage: null }));
    try {
      const result = await session.stopAndProcess();
      setState({
        question: result.question,
        answer: result.answer,
        phase: 'ready',
        errorMessage: null,
      });
    } catch (err) {
      setState({
        question: '',
        answer: '',
        phase: 'error',
        errorMessage: describeError(err),
      });
      logger.warn('Ask: voice query failed', err);
    }
  }, []);

  const handleRetry = useCallback(() => {
    if (state.question.length > 0) {
      void submitTextQuery(state.question);
      return;
    }
    setState({ question: '', answer: '', phase: 'idle', errorMessage: null });
  }, [state.question, submitTextQuery]);

  const buttonState: BigButtonState = useMemo(() => {
    switch (state.phase) {
      case 'recording':
        return 'recording';
      case 'processing':
      case 'warmup':
        return 'pressed';
      default:
        return 'idle';
    }
  }, [state.phase]);

  const handleBigButton = useCallback(() => {
    if (state.phase === 'recording' || state.phase === 'warmup') {
      void stopVoice();
      return;
    }
    if (state.phase === 'idle' || state.phase === 'ready' || state.phase === 'error') {
      void startVoice();
    }
  }, [state.phase, startVoice, stopVoice]);

  const isBusy = state.phase === 'processing' || state.phase === 'warmup';

  return (
    <Surface>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <DisplayHead style={styles.title}>Ask the log.</DisplayHead>
        </View>

        <View style={styles.body}>
          {state.question.length > 0 ? (
            <DisplayLead style={styles.question}>“{state.question}”</DisplayLead>
          ) : null}

          {state.question.length > 0 ? <View style={styles.divider} /> : null}

          {isBusy ? (
            <PulsingEllipsis label={state.phase === 'warmup' ? 'warming up…' : 'thinking…'} />
          ) : null}

          {state.phase === 'ready' && state.answer.length > 0 ? (
            <>
              <StreamingAnswer text={state.answer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Replay answer"
                onPress={() => {
                  void speakAgain();
                }}
                style={({ pressed }) => [styles.replay, pressed ? styles.pressed : null]}
              >
                <MicroCaps style={styles.replayCaption}>played aloud · tap to repeat</MicroCaps>
              </Pressable>
            </>
          ) : null}

          {state.phase === 'idle' && state.answer.length === 0 && state.question.length === 0 ? (
            <DisplayLead style={styles.empty}>Ask anything about your records.</DisplayLead>
          ) : null}

          {state.phase === 'error' && state.errorMessage ? (
            <View style={styles.errorBlock}>
              <BodyMd style={styles.errorText}>{state.errorMessage}</BodyMd>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry"
                onPress={handleRetry}
                style={({ pressed }) => [styles.retry, pressed ? styles.pressed : null]}
              >
                <MicroCaps style={styles.retryLabel}>Retry</MicroCaps>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.controls}>
          <TextInput
            value={textInputValue}
            onChangeText={setTextInputValue}
            placeholder="type a question"
            placeholderTextColor={color.inkSoft}
            style={styles.input}
            returnKeyType="search"
            editable={!isBusy && state.phase !== 'recording'}
            onSubmitEditing={() => {
              const value = textInputValue;
              setTextInputValue('');
              void submitTextQuery(value);
            }}
            accessibilityLabel="Type a question"
          />

          <View style={styles.bigButtonWrap}>
            <View style={[styles.bigButtonScaleHost, scaleStyle]}>
              <BigButton
                state={buttonState}
                onPress={handleBigButton}
                accessibilityLabel={
                  state.phase === 'recording' ? 'Recording. Tap to stop.' : 'Ask a voice question.'
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </Surface>
  );
}

// Wrap-with-scale strategy chosen over a `compact` prop on BigButton:
// keeps the primitive untouched (per the workstream constraint), preserves
// haptic + breathing semantics, and visually delivers the ~96px target the
// Query screen calls for.
const scaleStyle: ViewStyle = { transform: [{ scale: COMPACT_SCALE }] };

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 160,
    flexGrow: 1,
  },
  header: {
    paddingTop: space.silence,
    paddingHorizontal: space.lg,
  },
  title: {
    color: color.inkMuted,
  },
  body: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    gap: space.lg,
    minHeight: 180,
  },
  question: {
    color: color.ink,
  },
  divider: {
    height: 1,
    width: '24%',
    backgroundColor: color.mist,
  },
  empty: {
    color: color.inkMuted,
  },
  replay: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.55,
  },
  replayCaption: {
    color: color.inkSoft,
  },
  errorBlock: {
    gap: space.md,
  },
  errorText: {
    color: color.inkMuted,
  },
  retry: {
    alignSelf: 'flex-start',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.cream,
  },
  retryLabel: {
    color: color.ink,
  },
  controls: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    alignItems: 'center',
    gap: space.lg,
  },
  input: {
    width: '100%',
    backgroundColor: color.cream,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    color: color.ink,
    fontSize: 16,
  },
  bigButtonWrap: {
    width: COMPACT_TARGET_PX,
    height: COMPACT_TARGET_PX,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
  },
  bigButtonScaleHost: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
