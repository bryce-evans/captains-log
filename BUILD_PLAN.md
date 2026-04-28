# Build Plan

This file orders the 43 tasks in [TASKS.md](TASKS.md) into an executable build sequence. It is the *order of operations* layer; static scope lives in [PLAN.md](PLAN.md), live state lives in `bd`. Read [CLAUDE.md](CLAUDE.md) first for the agent workflow.

## Critical path

```
T001 → T028 → T027 → T009 → T011 → T012 → T032 → T013 → T015 → T021 → T026
 2h    4h    1d    1d    4h    1d    4h    4h   2h    1d    4h   ≈ 7 working days
```

Everything else parallelizes around this line. If T027 (whisper.rn spike) fails, the whole voice chain re-plans — gate hard on it.

## Phase map

Each phase ends at a milestone that is independently demoable. Tasks within a phase can run in parallel by workstream lane.

### Phase 0 — Bootstrap *(M0: app boots)*

| Lane | Task | Est | Notes |
|------|------|-----|-------|
| WS1 | T001 Init Expo + TS + core deps | 2h | Blocks **everything**. One person. |

**Exit gate:** `npm start` opens "Hello World" on iOS sim and Android emulator; `tsc --noEmit` passes.

---

### Phase 1 — Foundation *(M1: native build pipeline + data layer + design tokens)*

Four lanes run in parallel after T001 lands.

| Lane | Tasks | Order | Total est |
|------|-------|-------|-----------|
| **Native** (WS1) | T028 EAS dev client → T027 whisper.rn spike | sequential | 1.5d |
| **Data** (WS1) | T002 SQLite + migrations → {T003 SchemaRepo, T004 RecordRepo, T035 FileStorage} parallel → T005 Zustand slices | mostly parallel | 1.5d |
| **Design system** (WS3) | {T039 fonts, T040 tokens + Surface, T041 motion utils} parallel | parallel | 0.5–1d |
| **Infra** (WS4) | T033 Jest + RNTL | standalone | 0.5d |

**Human-blocking inside this phase:**
- **T027 spike** — needs a real Android device + iOS device/sim with Xcode. Outputs the whisper-model recommendation that T009 consumes.
- **T028** — Apple developer account (free tier OK) for device builds; Android keystore can auto-generate.

**Exit gate (M1):**
- Custom dev client installs on iOS device and Android device.
- whisper.rn spike committed: decision doc + benchmark table + recommended model.
- SQLite migrations run idempotently; both seed schemas present.
- Design tokens compile; `Surface` primitive renders paper bg + grain + top haze.
- Jest runs the seed test suite green.

---

### Phase 2 — Vertical scaffolding *(M2: schema selector renders with real design)*

| Lane | Tasks | Deps | Est |
|------|-------|------|-----|
| WS3 | T018 Expo Router tabs | T001 | 2h |
| WS3 | T042 Component primitives (FieldCard, BigButton, PillSelector, ToastQuiet) | T039+T040+T041 | 1d |
| WS2 | T009 whisper.rn integration + bundled model | T027 | 1d |
| WS2 | T010 Mic capture (chunked WAV) | T028+T035 | 4h |
| WS1 | T007 Auto-fill (GPS + weather + timestamp) | T004 | 4h ⚠ needs `OPENWEATHER_API_KEY` |
| WS1 | T006 AI query engine (NL → SQL → answer) | T004 | 1d ⚠ needs `OPENAI_API_KEY` |
| WS3 | T019 Schema selector screen | T003+T005+T018+T042 | 4h |
| WS4 | T038 README | T001+T028 | 2h |
| WS3 | T037 App icon + splash | T001 | 2h ⚠ needs icon PNG |

**Exit gate (M2):**
- Three tabs render (Record, Albums, Query) with the design system applied.
- Schema selector lets the user pick Fishing or Art Show; choice persists across cold launch.
- Mic capture round-trips a WAV file at 16kHz mono.
- whisper.rn transcribes a bundled test clip on real iOS + Android devices in airplane mode.
- AI query engine returns a formatted answer for a hardcoded NL question against a seeded record.

---

### Phase 3 — Voice pipeline *(M3: speak → record persists)*

This is the product's beating heart. Owned almost entirely by WS2.

| Order | Tasks | Deps | Est |
|-------|-------|------|-----|
| 1 | T011 Transcription handler (partial + final events) | T009+T010 | 4h |
| 2 | T012 Field extraction (GPT-4o function-calling) | T005+T011 | 1d |
| 3 | T032 Type-coerce + validate against schema | T004+T012 | 4h |
| 4 | T013 Live field-update events to Zustand | T012+T032 | 4h |
| 5 | T014 "Done" utterance detection | T012 | 2h |
| 6 | T015 Assemble record + persist | T013+T014+T005 | 2h |
| 7 | T017 Mic permissions + interruption handling | T010 | 4h |
| 8 | T016 Query-mode voice session (whisper → SQL → expo-speech) | T006+T011 | 1d |

**Run T017 in parallel** with T011→T015 — it's defensive plumbing on the same audio session.

**Exit gate (M3):**
- Programmatic test (no UI): start mic session → speak "I caught a 14 inch perch" → SQLite has a fishing record with `species=perch, length_in=14`.
- Query session: speak "how many records do I have" → expo-speech says "two" (or whatever count is correct).
- Airplane mode: transcription still works; field extraction surfaces a typed network error without crashing.

---

### Phase 4 — Screens *(M4: full UI vertical slice)*

| Lane | Tasks | Deps | Est |
|------|-------|------|-----|
| WS3 | T020 Live checklist UI | T013+T018+T042 | 4h |
| WS3 | T030 End-of-record review modal | T005+T015+T020 | 4h |
| WS3 | T021 Record creation screen (big button + checklist + done) | T005+T015+T019+T020+T030+T042 | 1d |
| WS3 | T022 Albums list | T004+T018 | 4h |
| WS3 | T023 Record detail view | T004+T018 | 4h |
| WS3 | T024 Photo attach (expo-image-picker) | T004+T018+T035 | 2h |
| WS3 | T025 Query screen | T006+T016+T018 | 4h |
| WS3 | T036 Offline/loading/error states | T013+T020+T021+T025 | 4h |
| WS3 | T043 Decorative glyphs (wave, sun) — P2 | T040 | 2h |

T022, T023, T024, T025 can run in parallel; T021 sequences after T020+T030.

**Exit gate (M4):**
- Demo script in T026 acceptance criteria runs end-to-end on a real device.
- Reduced-motion toggle behaves per DESIGN.md.
- Voice queueing under network loss surfaces a Toast and replays on reconnect.

---

### Phase 5 — Hardening + ship *(M5: MVP demo passes)*

| Lane | Tasks | Deps | Est |
|------|-------|------|-----|
| WS4 | T008 Integration tests (schema seed, CRUD, AI query round-trip) | T006+T033 | 4h |
| WS3 | T026 Full MVP smoke test | T008+T017+T021+T022+T023+T024+T025+T036 | 4h |
| WS4 | T034 GitHub Actions CI (typecheck + lint + test) | T033 | 2h |

**Exit gate (M5 — MVP done):**
- T026 demo script passes on iOS sim, real iOS, real Android.
- Demo video + screenshots committed for README.

---

### Phase 6 — Pre-distribution *(only required before any public build)*

| Lane | Task | Deps | Est | Why |
|------|------|------|-----|-----|
| WS1 | T029 OpenAI key protection (proxy or distribution guard) | T012 | 1d | Bundled `OPENAI_API_KEY` is extractable. Hard gate before non-dev distribution. |
| WS1 | T031 Schema duplication on edit (post-MVP) | T003 | 4h | Tracked for traceability; ship after MVP. |

## Parallelization map (who can work on what right now)

After M1 (foundation), three roles can move concurrently:

- **Voice engineer (WS2)**: T009 → T010 → T011 → T012 → T032 → T013–T015 → T016 → T017
- **Frontend engineer (WS3)**: T018 → T042 → T019 → T020 → T021 → T022/T023/T024/T025 → T036
- **Backend / data engineer (WS1)**: T006 → T007 → T029 (timed for distribution gate)

WS3 cannot start T020 until WS2 ships T013, but everything before T020 (selector, primitives, navigation, albums, detail, query screen shell) is independent. Stage the screens to use mocked Zustand state during the WS2 gap.

## Human-blocking gates

These are the moments work pauses on a person, not a keyboard. Schedule them ahead.

| Gate | When | What's needed |
|------|------|---------------|
| **G1** | Before T028 | Apple dev account (free tier), Xcode + Android SDK installed |
| **G2** | Before T009 | Whisper ggml model file (recommendation lands in T027) downloaded to `assets/models/` |
| **G3** | Before T012 | `OPENAI_API_KEY` in `.env` |
| **G4** | Before T007 | `OPENWEATHER_API_KEY` in `.env` |
| **G5** | Before T037 | 1024×1024 app icon PNG, bundle id, display name |
| **G6** | Before any non-dev build | T029 strategy chosen (proxy vs. distribution guard) and provisioned |

## Risk register

| # | Risk | Likelihood | Mitigation |
|---|------|------------|------------|
| R1 | whisper.rn won't work in Expo dev client (native module friction, Android build complexity) | Medium | T027 is a *time-boxed* spike. If it fails, fall back to cloud Whisper API per PROJECT.md (alternative kept warm). |
| R2 | Whisper accuracy on small models is poor for fishing/sale jargon | Medium | T027 benchmarks accuracy on real domain phrases; upgrade to `base` or `small` quantized variant if `tiny` is insufficient. |
| R3 | iOS audio session interruptions (calls, Siri) corrupt sessions | High | Budget T017 generously; T010 explicitly tests interruption recovery. |
| R4 | GPT-4o per-utterance cost balloons during dev | Low | Each utterance ≈ 1 small structured-output call; fine for dev. Cache function-call schema per `schema.id` (T012). |
| R5 | `OPENAI_API_KEY` extracted from a dev build that escapes into the wild | Medium | T029 gate. Until then, no TestFlight, no Play internal track, no APK shared outside the team. |
| R6 | Memory pressure on lower-end Android during simultaneous mic + photo + extraction | Medium | T026 smoke-tests on a real low-end device; if pressure shows up, throttle photo decoding. |
| R7 | Reanimated v3 + variable-axis fonts on Android render inconsistently | Low | T039 + T041 verify on Android explicitly; both have known platform-specific footguns. |

## Quality gates per phase

Apply on every PR within a phase:

- `tsc --noEmit` clean
- `eslint` clean
- `jest` green (coverage ≥ 80% once core lands per T033)
- `bd update <id> --claim` on start, `bd close <id>` on merge
- File size policy: 200–400 lines typical, 800 max (PreToolUse hook enforces)
- Workstream boundary check: WS3 must not call SQLite directly; WS2 must not render UI; WS1 must not own audio session.

## Definition of MVP done

All of the following must be true:
1. T026 smoke test passes on iOS sim, real iOS device, real Android device.
2. Two seeded schemas usable; voice creates records under each.
3. Album view lists records with photo + fields.
4. Query mode answers at least 5 representative questions correctly via voice.
5. Reduced-motion + VoiceOver/TalkBack pass per DESIGN.md accessibility section.
6. README walks a new contributor from clean checkout → running dev client.
7. CI green on `master`.

Distribution-ready (post-MVP) additionally requires T029 + T034 + T037.

## Re-planning triggers

Re-open this plan if any of these fire:

- T027 spike returns "no viable RN binding" → reroute T009–T011 to cloud Whisper.
- A workstream boundary violation lands and is non-trivial to undo.
- Any P0 task slips by > 2× its estimate — flag in the next stand-up before continuing.
- Apple/Google policy change touching mic/background audio.
