import { resetDatabaseForTests } from '../../db/database';
import type { Schema } from '../../db/schema';
import { FISHING_SCHEMA_ID } from '../../db/seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../../db/SchemaRepository';
import { useStore } from '../../store';
import { resetActiveFakeDb } from '../../test/inMemoryDb';
import { StubFieldExtractor } from '../extraction/StubFieldExtractor';
import type { MicService, StartRecordingOptions } from '../mic/MicService';
import { VoiceSession } from '../VoiceSession';
import { WhisperStubAdapter } from '../whisper/WhisperStubAdapter';

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

  async stopRecording(): Promise<{ uri: string; durationMs: number }> {
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

  emitChunk(uri: string): void {
    this.opts?.onChunk?.({ uri, index: 0, durationMs: this.opts.chunkDurationMs ?? 2000 });
  }
}

async function bootstrapStoreWithFishingSchema(): Promise<Schema> {
  await SchemaRepository.findAll(); // triggers seeding
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
}

function makeSession({ mic, whisper, extractor }: MakeSessionArgs): VoiceSession {
  const schema = useStore.getState().activeSchema;
  if (!schema) {
    throw new Error('Active schema must be set before constructing VoiceSession');
  }
  const setField = useStore.getState().setField;
  const markDone = useStore.getState().markDone;
  const clearDraft = useStore.getState().clearDraft;
  return new VoiceSession({
    mic,
    whisper,
    extractor,
    schema,
    setField,
    markDone,
    clearDraft,
  });
}

describe('VoiceSession', () => {
  beforeEach(async () => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
    useStore.setState({ activeSchema: null, draft: Object.freeze({}) });
    await bootstrapStoreWithFishingSchema();
  });

  test('updates the store when extraction yields valid fields', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    const updates: Array<{ key: string; value: string | number }> = [];
    session.on('fieldUpdate', (e) => updates.push(e));

    await session.start();
    session.feedTranscript('I caught a 14 inch perch off the dock');

    // wait for the async extraction microtasks to flush
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    const draft = useStore.getState().draft;
    expect(draft.species).toBe('perch');
    expect(draft.length_in).toBe(14);
    expect(updates.find((u) => u.key === 'species')?.value).toBe('perch');
    expect(updates.find((u) => u.key === 'length_in')?.value).toBe(14);
    await session.cancel();
  });

  test('detects done utterance and finalizes the record', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    let doneSeen = false;
    session.on('doneDetected', () => {
      doneSeen = true;
    });
    let completedRecordId: string | null = null;
    session.on('completed', (e) => {
      completedRecordId = e.record.id;
    });

    await session.start();
    session.feedTranscript('I caught a 14 inch perch');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    session.feedTranscript('okay I am done');
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    expect(doneSeen).toBe(true);
    expect(completedRecordId).not.toBeNull();
    expect(session.status).toBe('done');
  });

  test('emits needsReview when important fields are empty on done', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    const reviews: string[][] = [];
    session.on('needsReview', (e) => {
      reviews.push([...e.emptyImportantKeys]);
    });

    await session.start();
    session.feedTranscript('done');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toEqual(expect.arrayContaining(['species', 'length_in']));
    expect(session.status).toBe('done');
  });

  test('cancel does not save and resets status to idle', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    let completed = 0;
    session.on('completed', () => {
      completed += 1;
    });

    await session.start();
    session.feedTranscript('I caught a 14 inch perch');
    await session.cancel();

    expect(completed).toBe(0);
    expect(session.status).toBe('idle');
  });

  test('only one save executes when stop and done both fire', async () => {
    const mic = new FakeMic();
    const whisper = new WhisperStubAdapter();
    const extractor = new StubFieldExtractor();
    const session = makeSession({ mic, whisper, extractor });

    let completedCount = 0;
    session.on('completed', () => {
      completedCount += 1;
    });
    let needsReviewCount = 0;
    session.on('needsReview', () => {
      needsReviewCount += 1;
    });

    await session.start();
    session.feedTranscript('I caught a 14 inch perch and I am done');
    await session.stop();
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    expect(completedCount + needsReviewCount).toBe(1);
  });
});
