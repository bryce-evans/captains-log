/**
 * Integration: full voice-session pipeline using stubs that do not touch
 * native code:
 *   FakeMic + WhisperStubAdapter + StubFieldExtractor
 * driving the real VoiceSession into the real Zustand store and the real
 * RecordRepository (against the in-memory SQLite test seam).
 *
 * Covers T008 acceptance: a record is created end-to-end after a "done"
 * utterance, and field updates land in the store mid-session.
 */
import { resetDatabaseForTests } from '../../db/database';
import { RecordRepository } from '../../db/RecordRepository';
import type { Schema } from '../../db/schema';
import { FISHING_SCHEMA_ID } from '../../db/seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../../db/SchemaRepository';
import { useStore } from '../../store';
import { resetActiveFakeDb } from '../../test/inMemoryDb';
import { StubFieldExtractor } from '../../voice/extraction/StubFieldExtractor';
import type {
  MicChunk,
  MicService,
  StartRecordingOptions,
  StopRecordingResult,
} from '../../voice/mic/MicService';
import { VoiceSession, type VoiceSessionDeps } from '../../voice/VoiceSession';
import { WhisperStubAdapter } from '../../voice/whisper/WhisperStubAdapter';

const fileSystemMock = require('expo-file-system/legacy') as {
  __reset?: () => void;
};

class FakeMic implements MicService {
  private recording = false;
  private opts: StartRecordingOptions | null = null;

  async requestPermission(): Promise<boolean> {
    return true;
  }

  async startRecording(opts?: StartRecordingOptions): Promise<void> {
    this.recording = true;
    this.opts = opts ?? null;
  }

  async stopRecording(): Promise<StopRecordingResult> {
    this.recording = false;
    return { uri: 'file:///mock/audio.wav', durationMs: 100 };
  }

  isRecording(): boolean {
    return this.recording;
  }

  async cleanup(): Promise<void> {
    this.recording = false;
    this.opts = null;
  }

  emitChunk(chunk: MicChunk): void {
    this.opts?.onChunk?.(chunk);
  }
}

async function seedAndActivateFishingSchema(): Promise<Schema> {
  await SchemaRepository.findAll();
  const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
  if (!schema) {
    throw new Error('Fishing schema missing after seed');
  }
  useStore.setState({ activeSchema: schema, draft: Object.freeze({}) });
  return schema;
}

interface MakeSessionArgs {
  readonly mic: MicService;
  readonly whisper: WhisperStubAdapter;
  readonly extractor: StubFieldExtractor;
  readonly chunkDurationMs?: number;
}

function makeSession(args: MakeSessionArgs): VoiceSession {
  const schema = useStore.getState().activeSchema;
  if (!schema) {
    throw new Error('Active schema must be set before constructing VoiceSession');
  }
  const setField = useStore.getState().setField;
  const markDone = useStore.getState().markDone;
  const clearDraft = useStore.getState().clearDraft;
  const deps: VoiceSessionDeps = {
    mic: args.mic,
    whisper: args.whisper,
    extractor: args.extractor,
    schema,
    setField,
    markDone,
    clearDraft,
    ...(args.chunkDurationMs !== undefined ? { chunkDurationMs: args.chunkDurationMs } : {}),
  };
  return new VoiceSession(deps);
}

async function flushAsync(ms = 50): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe('integration: voice session end-to-end', () => {
  beforeEach(async () => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
    fileSystemMock.__reset?.();
    useStore.setState({ activeSchema: null, draft: Object.freeze({}) });
    await seedAndActivateFishingSchema();
  });

  test('"I caught a 14 inch perch" populates species and length_in in the draft', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    await session.start();
    session.feedTranscript('I caught a 14 inch perch');
    await flushAsync();

    const draft = useStore.getState().draft;
    expect(draft.species).toBe('perch');
    expect(draft.length_in).toBe(14);

    await session.cancel();
  });

  test('a follow-up "done" utterance finalizes the session and persists a record', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    let completedRecordId: string | null = null;
    session.on('completed', (e) => {
      completedRecordId = e.record.id;
    });
    let doneSeen = false;
    session.on('doneDetected', () => {
      doneSeen = true;
    });

    await session.start();
    session.feedTranscript('I caught a 14 inch perch');
    await flushAsync();
    session.feedTranscript('okay I am done');
    await flushAsync(150);

    expect(doneSeen).toBe(true);
    expect(completedRecordId).not.toBeNull();
    expect(session.status).toBe('done');

    // The record should be queryable through the repository.
    const persisted = await RecordRepository.findBySchema(FISHING_SCHEMA_ID);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.fields.species).toBe('perch');
    expect(persisted[0]?.fields.length_in).toBe(14);

    // The draft slice should be cleared after a successful save.
    expect(useStore.getState().draft).toEqual({});
  });

  test('whisper-driven chunk pipeline maps audio uri → transcript → field update', async () => {
    // Exercise the real TranscriptionHandler chunk path via the stub
    // adapter — feeding a uri whose basename matches a canned transcript
    // (test1 → "I caught a 14 inch perch off the dock") so the whole
    // mic → whisper → transcription → extraction → store chain runs.
    //
    // The handler only emits `final` after a silence chunk follows a
    // populated chunk, so we feed a non-matching basename second to
    // produce silence — except the stub default is "Hello world". We
    // bypass that by using a uri the stub does not match AND by
    // injecting an empty-text override transcript.
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter({
      transcripts: [
        { match: 'speech', text: 'I caught a 14 inch perch' },
        { match: 'silence', text: '' },
      ],
      defaultTranscript: '',
    });
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor, chunkDurationMs: 2000 });

    await session.start();
    mic.emitChunk({ uri: 'file:///mock/speech.wav', index: 0, durationMs: 2000 });
    // Wait for whisper.transcribe (200ms latency) on the speech chunk to
    // resolve before emitting the silence chunk; otherwise the silence
    // path can race ahead of the speech path.
    await flushAsync(400);
    mic.emitChunk({ uri: 'file:///mock/silence.wav', index: 1, durationMs: 2000 });
    await flushAsync(400);

    const draft = useStore.getState().draft;
    expect(draft.species).toBe('perch');
    expect(draft.length_in).toBe(14);

    await session.cancel();
  });
});
