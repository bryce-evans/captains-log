# Captain's Log

A mobile app for creating voice-driven field records — fish catches, art show sales, or anything with a schema. Hold a button, speak your data, release to save.

## What it does

- **Voice-first recording** — hold the mic button and speak field values aloud; they check off live as Claude parses your speech
- **Live field checklist** — see remaining fields at the top, completed fields animate down as they resolve
- **Schema switching** — two built-in schemas (Fishing Catch, Art Show Sale); switch via the ⋮ menu
- **Albums view** — browse all records in a book-like card layout; tap to see full detail
- **Query mode** — ask natural-language questions about your records ("biggest fish?", "last sale over $100?")
- **Auto-fill fields** — timestamp, GPS location, and weather filled automatically at record time

## Stack

| Layer | Tech |
|-------|------|
| Mobile framework | [Expo](https://expo.dev) (React Native) |
| Navigation | [Expo Router](https://expo.github.io/router) (file-based) |
| UI components | [React Native Paper](https://callstack.github.io/react-native-paper/) (Material Design 3) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Database | SQLite via `expo-sqlite` (planned) |
| Voice | OpenAI Realtime API (planned) |
| AI queries | GPT-4o function-calling → SQLite (planned) |
| Fonts | Galley (local, headers) · Inter (Google Fonts, body) |

## Getting started

```bash
cd mobile
npm install
npx expo start --web      # web browser demo
npx expo start --ios      # requires Xcode + iOS Simulator
npx expo start --android  # requires Android Studio
```

Open the Expo Go app on your phone and scan the QR code to run on a real device.

## Running the web demo

```bash
cd mobile
npx expo start --web
```

Then open [http://localhost:8081](http://localhost:8081) in your browser. The demo runs with mock data and simulated voice fill — no API keys required.

## Project structure

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout, font loading, Paper theme
│   ├── index.tsx            # Redirect → /(tabs)/record
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar (Record · Albums · Query)
│   │   ├── record.tsx       # Hold-to-record screen with live checklist
│   │   ├── albums.tsx       # Record card list
│   │   └── query.tsx        # Natural-language query screen
│   └── record/[id].tsx      # Record detail view
├── components/
│   ├── LiveChecklist.tsx    # Animated field completion list
│   └── SchemaSelector.tsx   # Schema picker (used in menu)
├── store/
│   └── index.ts             # Zustand store — schemas, records, field state
├── assets/fonts/
│   └── Galley.ttf           # Custom header font
└── theme.ts                 # Colors + font family constants
```

## Schemas

Schemas define what fields a record has. Two are hardcoded for the MVP:

**🎣 Fishing Catch** — Species, Weight (lbs), Length (in), Lure / Bait, Location, Time, Weather, Notes

**🎨 Art Show Sale** — Item Sold, Price ($), Payment Method, Buyer Name, Time, Notes

Fields marked `important: true` appear in red and are surfaced first during recording.

## Workstreams

| ID | Name | Scope |
|----|------|-------|
| WS1 | Bedrock | SQLite schema, record storage, migrations, AI query engine |
| WS2 | Songbird | Voice capture, OpenAI Realtime API, live field extraction, record assembly |
| WS3 | Folio | All screens, navigation, schema selector, live checklist, albums |

See [TASKS.md](TASKS.md) for the full task manifest and [PLAN.md](PLAN.md) for workstream status.

## Issue tracking

This project uses [beads](https://github.com/bead-tracker/beads) (`bd`):

```bash
bd ready          # find available work
bd show <id>      # view issue details
bd close <id>     # mark complete
```
