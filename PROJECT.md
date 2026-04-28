# Project Definition

## Motivation

a mobile app for making creating records of events very quickly with hands free. Using voice and claude, we can answer quesitons. This is useful for taking record of fish catches while on a boat, or selling items at an art show. Records can have an optional photo(s) attached, but the most important thing is using voice to create records. and voice to answer questions about past records


## Goals

hands free creation of records
allow attaching photos to events
have a defined schema of all possible items to record
allow for switching between schemas
show the user a live view of items remaining in the record, and as they talk, check them off so they see which ones are remaining
in the schema, mark items as important. put them at the top and double check at the end to confirm with the user it is okay if they are empty.
have a set of certain fields be special to be auto-filled in, such as current time, current gps location, current weather at location
store records on device and have coie to answer questions such as "last time I recorded X?" or "biggest fish I caught?" "how many perch did I catch?"
optional cloud backup, but this is past MVP for a later stage of the poject.
optional login and billing for subscription, at a later stage past mvp
a nice ui that has a way to view all records and view data in a book-like ui


## Success Criteria

user can define a new schema, edit an existing schema, select important comments
user can create a record with voice. the main point of the app is to add a record. We have a set active schema, and a big button to create records. all fields show ina  list, and as the user speaks, live translation answers the fields and they get filled in. filled ones go to the bottom of the list, and remaining ones sit at the top. 
user can view their records in albums
auto fields like weather, lat long, time of day can be set 
schemas are mostly text but can be numbers like temp. these are validated so we can't set them to invalid data. or a warning shows if we dont. because of how answers need to wrok, we can't save data that is invalid to the schema (we can't store "ABC" as the "temperature." it will mess up Q&A feature
user can go to query mode and ask questions about their records


## Priorities

MVP should just be select from two existing scheumas that are predefined
use voice to add records. allow anything to be blank. say "done" to be done.
view records
enter query mode to ask questions. claude should make SQL commands to the db to answer them
eerything is local, no login, billing, or cloud required for mvp


## Resources Allowed

lets use react native to be able to deploy on ios and android
lets use whisper.cpp running on-device for voice transcription (https://github.com/ggml-org/whisper.cpp) — no network calls for transcription; integrate via a React Native binding such as whisper.rn and ship a quantized model in the app bundle
lets use sql for local db
chatgpt (GPT-4o) for parsing transcripts into schema fields, and for generating SQL to answer questions about records
on-device TTS (e.g. expo-speech) for spoken answers in query mode
bd (beads) for issue tracking — TASKS.md is the static manifest, bd holds live state. See CLAUDE.md for the agent workflow.
OpenWeatherMap free tier for the weather auto-fill field (free dev key sufficient for MVP)
EAS Build (Expo Application Services) for producing dev clients and release builds — required because whisper.rn ships native code that Expo Go cannot run


## Resources Off Limits


\
\
\
\


## Final Result

The user creates records via voice, can see records in albums, and ask quesitons via voice to answer questions about them

## Review Notes

**[Risk]** The OpenAI Realtime API requires a persistent WebSocket with continuous internet — on a boat or outdoor art show, spotty cellular breaks the entire record-creation flow with no offline fallback. This is the highest-risk single point of failure for the core use case.

> lets do this for now, long term we can try an ondevice model.

> **Update 2026-04-27:** Decision reversed early. Switching to whisper.cpp running on-device for transcription (no WebSocket, no network for capture-to-text). The boat/art-show offline gap for record creation is now eliminated. Network is still required for GPT-4o field extraction and SQL generation, but utterances can be queued and parsed when connectivity returns without losing the audio capture step.

**[Risk]** iOS audio session management in Expo is notoriously fragile: audio category conflicts, interruptions (phone calls, Siri), and streaming PCM audio over WebSocket from React Native have caused multi-week delays in comparable projects. Budget significant time here before any feature work.

> are there other options that are better? maybe we revisit this decision

> **Update 2026-04-27:** Revisited. Going on-device with whisper.cpp removes the WebSocket-streaming half of this risk entirely — no PCM-over-WebSocket pipeline to debug. Audio session category, interruption handling, and recording lifecycle still apply, but the failure surface is much smaller. New risk: bundling and loading a whisper model file in an Expo binary (size, first-launch cost, device CPU/memory headroom on lower-end Android).

**[Motivation]** The "live field check-off as you speak" success criterion does not actually require the Realtime API's streaming — it requires knowing which fields are filled after each utterance. A post-utterance parse (record → transcribe → GPT-4o structured extraction) achieves the same UX, is 10x cheaper, and degrades gracefully offline. The Realtime API is over-specified for this interaction pattern.

> maybe we start with something simpler. I'm concerned about quality of transcription with on device, and if we need gpt for faster answers anyways, might as well use one service for everything. But if that causes problems, there is nothing locking us to that. It was only chosen out of perceived simplicity which might be misplaced

> **Update 2026-04-27:** Adopting this pattern with whisper.cpp on-device instead of cloud Whisper. Pipeline: record audio chunk → whisper.cpp transcribes locally → GPT-4o function-calling extracts fields → store updates → checklist re-renders. Quality risk on small whisper models is real; mitigation is to start with a small/medium quantized model (e.g. ggml-base.en.q5_1) and upgrade if accuracy is insufficient.

**[Alternative]** Replace the Realtime API with Expo's built-in audio recorder + Whisper transcription + a single GPT-4o structured-output call per utterance. Audio can be recorded offline and queued for parsing when connectivity returns — directly solving the boat/art-show gap — with no change to the visible UX.

> No, I do not want this. I want to have streaming audio so interactions happen live, not a minute later.

> **Update 2026-04-27:** Adopting a variant of this alternative. Using whisper.cpp on-device (not cloud Whisper) so transcription is sub-second per chunk and "live" per utterance, not per minute. Field-extraction call to GPT-4o still requires network, but transcription itself is local and instant. If GPT-4o latency or offline behavior becomes a problem, field extraction is the next candidate to move on-device (e.g. small local LLM or rule-based extraction for known schemas).

**[Gap]** The OpenAI API key must live somewhere in the app bundle. Expo environment variables are compiled into the binary and extractable; there is no backend proxy in scope. For a distributed app this is a real credential-exposure risk that needs a decision before distribution.

> yes lets definitely mark this as a blocking task to resolve before deployment. This needs to be resolved but I'm not sure how to best handle this. We probably need a remote server to go through first with login and billing. Its okay for initial dev MVP

> **Update 2026-04-27:** Surface area is reduced — transcription no longer hits OpenAI, so the key is only used for field extraction (T012) and SQL generation (T016/T006). The credential-exposure risk and "needs a backend proxy before public distribution" conclusion are unchanged. Still blocking before any non-dev distribution.

**[Gap]** Schema evolution is unaddressed: if a user edits a schema after records exist, old records have fields that no longer exist in the new schema. The GPT-4o SQL-generation step assumes a consistent field structure, so this silently breaks the Q&A feature for any user who ever edits a schema.

> Schemas are not editable. A new schema will duplicate and create an entirely new one. If a schema is deleted, it deletes all associated tables with it

**[Clarify]** Is "switching between schemas" a global setting (one active schema at a time, all records share it) or a per-record choice (each record remembers which schema it was created with)? This changes how records are stored in SQLite and how the Q&A engine must join schema definitions to record rows.

> no, there is an active schema and this is what is used for writing and reading. Think of it as "mode" and then you can query or write within that mode

**[Gap 2026-04-27]** Removing the OpenAI Realtime API also removes its built-in TTS for spoken answers in query mode. Need a separate text-to-speech path for the Q&A "speak the answer" UX. Default plan: use expo-speech (system TTS on iOS/Android) — free, on-device, no network. If voice quality is unacceptable, fall back to a cloud TTS (OpenAI TTS, ElevenLabs) for the answer step only.

**[Gap 2026-04-27]** whisper.cpp model selection and bundling is a real decision that needs to be made before T009 lands. Options: ggml-tiny.en (~75MB), ggml-base.en (~150MB), ggml-small.en (~500MB), with quantized variants (q5_1, q8_0) shrinking each by ~40-60%. Trade-off is bundle size vs accuracy vs CPU cost on lower-end devices. Recommendation for MVP: start with ggml-base.en.q5_1 and benchmark on a real device before committing.

**[Gap 2026-04-27]** whisper.cpp does not have a first-party React Native binding. Most viable option is `whisper.rn` (community-maintained wrapper around whisper.cpp). Need to evaluate: maintenance status, Expo compatibility (likely requires a custom dev client, breaking Expo Go workflow), iOS and Android build complexity. This is a feasibility task that should land before T009 starts.

