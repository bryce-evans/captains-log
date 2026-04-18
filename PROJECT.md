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
lets use chatgpt live for voice control
lets use sql for local db
chatgpt for managing the sql and responding with answers


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

**[Risk]** iOS audio session management in Expo is notoriously fragile: audio category conflicts, interruptions (phone calls, Siri), and streaming PCM audio over WebSocket from React Native have caused multi-week delays in comparable projects. Budget significant time here before any feature work.

> are there other options that are better? maybe we revisit this decision

**[Motivation]** The "live field check-off as you speak" success criterion does not actually require the Realtime API's streaming — it requires knowing which fields are filled after each utterance. A post-utterance parse (record → transcribe → GPT-4o structured extraction) achieves the same UX, is 10x cheaper, and degrades gracefully offline. The Realtime API is over-specified for this interaction pattern.

> maybe we start with something simpler. I'm concerned about quality of transcription with on device, and if we need gpt for faster answers anyways, might as well use one service for everything. But if that causes problems, there is nothing locking us to that. It was only chosen out of perceived simplicity which might be misplaced

**[Alternative]** Replace the Realtime API with Expo's built-in audio recorder + Whisper transcription + a single GPT-4o structured-output call per utterance. Audio can be recorded offline and queued for parsing when connectivity returns — directly solving the boat/art-show gap — with no change to the visible UX.

> No, I do not want this. I want to have streaming audio so interactions happen live, not a minute later.

**[Gap]** The OpenAI API key must live somewhere in the app bundle. Expo environment variables are compiled into the binary and extractable; there is no backend proxy in scope. For a distributed app this is a real credential-exposure risk that needs a decision before distribution.

> yes lets definitely mark this as a blocking task to resolve before deployment. This needs to be resolved but I'm not sure how to best handle this. We probably need a remote server to go through first with login and billing. Its okay for initial dev MVP

**[Gap]** Schema evolution is unaddressed: if a user edits a schema after records exist, old records have fields that no longer exist in the new schema. The GPT-4o SQL-generation step assumes a consistent field structure, so this silently breaks the Q&A feature for any user who ever edits a schema.

> Schemas are not editable. A new schema will duplicate and create an entirely new one. If a schema is deleted, it deletes all associated tables with it

**[Clarify]** Is "switching between schemas" a global setting (one active schema at a time, all records share it) or a per-record choice (each record remembers which schema it was created with)? This changes how records are stored in SQLite and how the Q&A engine must join schema definitions to record rows.

> no, there is an active schema and this is what is used for writing and reading. Think of it as "mode" and then you can query or write within that mode

