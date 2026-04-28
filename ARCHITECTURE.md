# Architecture

## Overview

captains-log is a React Native + Expo mobile app for hands-free voice-driven record creation, with on-device transcription and a local-first SQLite store. Network is required only for GPT-4o calls (field extraction, NL→SQL); transcription, persistence, and TTS are fully offline.

## Component Map

| Component | Workstream | Layer | Purpose |
|-----------|------------|-------|---------|
| `src/db` | WS1 | Data | SQLite schema, migrations, repositories |
| `src/ai` | WS1 | Service | GPT-4o client, prompt templates, NL→SQL |
| `src/storage` | WS1 | Service | FileStorageService for audio + photos |
| `src/store` | WS1 | State | Zustand slices: activeSchema, recordDraft, transcript |
| `src/voice` | WS2 | Service | whisper.cpp wrapper, mic capture, extraction, validation |
| `app/` | WS3 | UI | Expo Router file-based routes (tabs, modals) |
| `src/components` | WS3 | UI | LiveChecklist, RecordCard, BigRecordButton, etc. |
| `src/hooks` | WS3 | UI | useVoiceSession, useActiveSchema, etc. |
| `src/test` | WS4 | Infra | Jest config, mocks for native modules |

## Data flow

### Record creation

mic → expo-av (chunked WAV, 16kHz mono) → whisper.cpp (local STT) → GPT-4o (extract fields) → `validateAgainstSchema()` (type coerce + reject) → Zustand `recordDraftSlice` → on "done" → review modal if important fields empty → `RecordRepository.insert()` → SQLite row + audio path + photo paths via `FileStorageService`.

### Query mode

mic → expo-av → whisper.cpp → GPT-4o (NL → SQLite SQL) → `RecordRepository` execute → format result → display + expo-speech TTS.

### Auto-fill (record creation)

On voice session start: `expo-location` (GPS) + `Date.now()` (timestamp) + OpenWeatherMap fetch → merged into `recordDraftSlice` as initial values. All non-blocking; failures degrade gracefully (record still saves without weather).

## Stores (Zustand contract)

This is the single shared contract surface across workstreams. WS1 owns the slice definitions; WS2 writes to them; WS3 reads from them.

### activeSchemaSlice

```ts
{
  activeSchema: Schema | null
  setActiveSchema(id: string): Promise<void>  // also persists
}
```

### recordDraftSlice

```ts
{
  draft: Partial<Record<FieldKey, FieldValue>>
  setField(key: FieldKey, value: FieldValue): void
  clearDraft(): void
  markDone(): Promise<RecordRow>  // calls RecordRepository.insert, clears draft
}
```

### transcriptSlice

```ts
{
  partial: string                  // rolling whisper output
  final: string[]                  // committed utterances
  appendPartial(s: string): void
  commitFinal(s: string): void
  clear(): void
}
```

## Repository interfaces

### SchemaRepository (T003)

```ts
findAll(): Schema[]
findById(id: string): Schema | null
create(definition: SchemaDefinition): Schema   // duplicate-on-edit (T031)
delete(id: string): void                       // cascades to records
```

### RecordRepository (T004)

```ts
insert(schemaId: string, fields: FieldMap, photoPaths?: string[], audioPath?: string): RecordRow
findAll(): RecordRow[]
findBySchema(schemaId: string): RecordRow[]
findById(id: string): RecordRow | null
attachPhoto(recordId: string, path: string): void
delete(id: string): void                       // also cleans files via FileStorageService
```

All return immutable record objects (no in-place mutation per coding-style).

## SQLite schema

```sql
CREATE TABLE schemas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  definition_json TEXT NOT NULL,   -- field defs, types, important flags, enum values
  created_at INTEGER NOT NULL
);

CREATE TABLE records (
  id TEXT PRIMARY KEY,
  schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  audio_path TEXT,
  photo_paths_json TEXT,           -- JSON array of FileStorageService paths
  fields_json TEXT NOT NULL        -- {fieldKey: typed value} matching schema
);

CREATE INDEX idx_records_schema ON records(schema_id);
CREATE INDEX idx_records_created ON records(created_at);

-- Per-connection: PRAGMA foreign_keys = ON;
```

Trade-off: storing fields as JSON keeps schema-per-record flexible at the cost of in-DB type enforcement. Validation runs at extraction time (T032) and at insert time (T004).

## Schema model

A schema is a "mode". Exactly one is active at a time. Records are bound to the schema they were created under via `records.schema_id`. Schemas are not editable; an "edit" creates a new schema row preserving the original (T031, post-MVP). Deleting a schema cascades to its records.

## Native modules and build pipeline

- `whisper.rn` ships native code → Expo Go cannot run the app
- Required: Expo dev client + EAS Build (T028)
- Bundled model: chosen by T027 spike (default plan: `ggml-base.en.q5_1`, ~80MB compressed) under `assets/models/`
- Inner loop: `eas build --profile development --local` → install dev client on device/sim → `npm start` for Metro

## External APIs

| API | Purpose | Key location | Network required |
|-----|---------|--------------|------------------|
| OpenAI GPT-4o | Field extraction (T012), NL→SQL (T006/T016) | `.env` (dev) / proxy (prod, T029) | yes |
| OpenWeatherMap | Auto-fill weather (T007) | `.env` | yes (degrades gracefully) |
| whisper.cpp via whisper.rn | STT (T009, T011, T016) | bundled model | no |
| expo-speech | TTS (T016) | system | no |
| expo-location | GPS (T007) | system permission | no (uses cached fix when available) |

## Key protection (T029)

Dev MVP ships `OPENAI_API_KEY` in `.env`, which becomes part of the bundle and is extractable. Acceptable for development only. Before any non-dev distribution, T029 must land — either a backend proxy (Cloudflare Worker / Supabase Edge Function / Vercel) or a hard guard that prevents distribution builds from running with a bundled key.

## Workstream boundaries

- **WS1 (Bedrock)** owns `src/db`, `src/ai`, `src/storage`, `src/store`. Defines the Zustand slice shapes and repository interfaces.
- **WS2 (Songbird)** owns `src/voice`. Reads/writes Zustand slices defined by WS1 and calls WS1 repositories. Never renders UI.
- **WS3 (Folio)** owns `app/`, `src/components`, `src/hooks`. Consumes Zustand state and calls WS1 repositories via the store. Never calls SQLite directly. Never owns the audio session — delegates to WS2.
- **WS4 (Steward)** owns testing infra, CI, README. Does not own product code.

A WS3 screen calling SQLite directly, or a WS2 service rendering UI, is a boundary violation that should be flagged in code review.

## File-size policy

200–400 lines typical, 800 max. The PreToolUse hook in CLAUDE.md guidance blocks writes > 800 lines.

## Testing seams

- Repositories abstract SQLite — tests use an in-memory adapter at the repo boundary
- Whisper service abstracts whisper.rn — tests mock the binding
- AI service abstracts GPT-4o — tests stub the client with canned responses
- All three are dependency-injected so workstreams can run isolated unit tests
