# Captain's Log

> A field journal that listens.

Captain's Log is a hands-free, voice-driven mobile journal for moments when typing isn't an option — fishing off a boat, selling at an art show, working a job site. You speak, the app transcribes on-device, extracts the right fields against the schema you've chosen, fills in your entry as you talk, and saves the record when you say "done." Later, in query mode, you ask questions ("biggest fish I caught?", "how many pieces did I sell at the show?") and a local SQLite store answers — read aloud through on-device TTS.

## Status

This repository is the **MVP-stage** build. The data layer, design system, voice services, and screens are all in place behind a stub-friendly architecture so you can run the JavaScript half of the app in Expo Go for design review.

**What works today:**

- SQLite schema, migrations, repositories, and the two seeded MVP schemas (Fishing, Art Show)
- Zustand store slices: `activeSchema`, `recordDraft`, `transcript`
- Voice pipeline (mic → whisper → field extraction → store) with stub adapters
- AI query engine with both a real GPT-4o path and a no-network stub
- Soft Maritime Journal design system: tokens, primitives, typography, and screens
- Auto-fill service: timestamp + GPS + OpenWeatherMap weather

**What's deferred (still on the board):**

- Live whisper.rn on-device inference — requires an EAS dev client (T009, T028)
- OpenAI key protection / backend proxy before any non-dev distribution (T029)
- End-to-end device smoke test of the integrated MVP (T026)

See [TASKS.md](TASKS.md) for the full task manifest.

## Prerequisites

- **Node 20+** and npm
- **Xcode 15+** with the iOS 17 simulator (for iOS dev client builds)
- **Android Studio** with the Android 14 SDK and an Android emulator (for Android dev client builds)
- **Optional: an EAS account** (`expo.dev`) to build and distribute the dev client used for whisper.rn

You do *not* need EAS, Xcode, or Android Studio just to run the JS half against stubs in Expo Go.

## Setup

```bash
git clone https://github.com/<your-org>/captains-log.git
cd captains-log
npm install --legacy-peer-deps
cp -f .env.example .env
# edit .env with your keys (see below)
```

`--legacy-peer-deps` is required while Expo SDK 54 and React 19 stabilize their peer ranges.

## Environment variables

`.env.example` is checked in. Copy it to `.env` and fill in:

| Variable | Purpose | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_OPENAI_API_KEY` | GPT-4o field extraction (T012) and SQL generation (T006/T016) | <https://platform.openai.com/api-keys> — **dev only**, see T029 for distribution |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | Auto-fill weather field (T007) | Free key from <https://openweathermap.org/api> |
| `EXPO_PUBLIC_USE_WHISPER_STUB` | Set to `true` to bypass whisper.rn — returns canned transcripts so the app runs in Expo Go | Local toggle |
| `EXPO_PUBLIC_USE_AI_STUB` | Set to `true` to bypass GPT-4o NL→SQL — uses a keyword-based stub query engine | Local toggle |
| `EXPO_PUBLIC_USE_EXTRACTION_STUB` | Set to `true` to bypass GPT-4o extraction — uses a keyword-based stub | Local toggle |

Variables prefixed with `EXPO_PUBLIC_` are compiled into the app bundle. Treat the OpenAI key as a **dev-only secret** until T029 lands.

## Whisper model (T009)

Required only for the real (non-stub) whisper adapter. Download `ggml-base.en.q5_1.bin` from <https://huggingface.co/ggerganov/whisper.cpp/tree/main> and place it at:

```text
assets/models/ggml-base.en.q5_1.bin
```

If you set `EXPO_PUBLIC_USE_WHISPER_STUB=true` you can skip this step — the stub adapter returns canned transcripts so the JS pipeline runs without the model.

## Run

```bash
npm start
```

That launches the Metro bundler. While the stubs are enabled the app runs in **Expo Go** — useful for design review and JS-only iteration. Once whisper.rn is wired (T028), Expo Go can no longer run the binary; you'll need a dev client (next section).

## Dev client / EAS

The project ships native config (`app.json`) ready for `expo prebuild`. To produce a dev client locally:

```bash
npx expo prebuild
eas build --profile development --platform ios --local      # or --platform android
```

`eas-cli` must be installed (`npm i -g eas-cli`) and you'll need an Apple Developer or Google Play account for signing on each platform. EAS builds are intentionally **not** part of CI.

## Test, typecheck, lint

```bash
npm test               # Jest unit + integration suites
npm run test:coverage  # Coverage report
npm run typecheck      # tsc --noEmit
npm run lint           # eslint . --ext .ts,.tsx
```

CI runs typecheck and tests on every push and PR — see `.github/workflows/ci.yml`. Lint warnings do not block CI yet.

## Project layout

```text
app/                     Expo Router file-based routes (tabs and modals)
src/
├── ai/                  GPT-4o client, prompt templates, NL→SQL, stub engine
├── components/          UI components: checklist, primitives, glyphs, navigation
├── db/                  SQLite, migrations, repositories, validation, seeds
├── hooks/               Reusable hooks (useReducedMotion, useBreathing)
├── services/            Cross-cutting services: AutoFill, ExtractionRetryQueue
├── storage/             FileStorageService for audio + photo paths
├── store/               Zustand slices: activeSchema, recordDraft, transcript
├── styles/              Design tokens, motion presets, typography presets
├── test/                Test seams: in-memory SQLite, file-system mock
├── utils/               Pure utilities (formatRecord)
├── voice/               Mic, whisper adapters, extraction, TTS, VoiceSession
└── __tests__/
    └── integration/     End-to-end JS tests (no native modules)
```

## Workstreams

| Workstream | Owns | Boundary |
|---|---|---|
| **WS1 — Bedrock** | `src/db`, `src/ai`, `src/storage`, `src/store` | Defines the slice shapes and repository interfaces |
| **WS2 — Songbird** | `src/voice` | Reads/writes WS1 slices; never renders UI |
| **WS3 — Folio** | `app/`, `src/components`, `src/hooks` | Consumes store; never calls SQLite directly |
| **WS4 — Steward** | testing infra, CI, README | No product code |

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full component map and boundary rules.

## Voice & AI architecture

- **Transcription** is on-device via `whisper.rn` (a community RN binding around `whisper.cpp`). No network for capture-to-text — the boat / art-show offline gap is closed for record creation.
- **Field extraction** and **NL→SQL** use **GPT-4o** online. Network is required, but the audio capture step is never blocked by connectivity.
- **TTS** is on-device via `expo-speech` (system voices on iOS and Android).

This pipeline is documented in detail in [ARCHITECTURE.md](ARCHITECTURE.md#data-flow).

## Deeper reading

- [PROJECT.md](PROJECT.md) — product motivation and decision log
- [ARCHITECTURE.md](ARCHITECTURE.md) — component boundaries, data flow, native build pipeline
- [DESIGN.md](DESIGN.md) — Soft Maritime Journal design direction, tokens, screen specs
- [STYLE.md](STYLE.md) — code conventions, linting, formatting
- [PLAN.md](PLAN.md) — workstreams and scope
- [TASKS.md](TASKS.md) — full task manifest with dependencies and acceptance criteria
- [BUILD_PLAN.md](BUILD_PLAN.md) — the phased build plan
