# Design

## Direction: **Soft Maritime Journal**

A modern, warm, hand-felt interface that treats every record as an entry in a kept book. Not skeuomorphic — no leather textures or rope flourishes — but the spirit of a weathered captain's log: paper warmth, ink permanence, sea-air calm, an unhurried hand. The phone disappears; the journal remains.

The user is recording a moment (a fish caught, a piece sold, a thought worth keeping). The interface should feel as inviting and forgiving as opening a notebook on a quiet morning. Soft curves, breathing motion, plenty of room. One bright warm accent — like the last light on the water — for the single most important action: pressing record.

This is not a tech app. It's a place to keep things.

## Inspiration

- Kinfolk and Cereal magazine layouts — generous whitespace, type-led, photographic restraint
- Old leather-bound captain's logs and field journals — pages with margins, ink that varies in weight
- Tide pools and watercolor washes — soft edges, color bleeding into color
- Apple's Journal app for restraint, but warmer and more humanist
- Things 3 for the unhurried, considered feel of every interaction
- Wabi-sabi — the small imperfection over the polished default

## One-line intent

> *A field journal that listens.*

---

## Design Tokens

All tokens live in `src/styles/tokens.ts` as a typed object. Hex values shown are the RN-compatible output; the source-of-truth is OKLCH for documentation clarity.

### Color

```ts
export const color = {
  // Surfaces
  paper:       '#FBF8F2',  // oklch(98% 0.005 80)  — primary background, warm paper
  paperDeep:   '#F4EFE3',  // oklch(94% 0.012 80)  — recessed surface, schema selector bg
  cream:       '#F7F3EA',  // oklch(96% 0.010 80)  — card surface
  mist:        '#EFEAE0',  // oklch(91% 0.012 80)  — muted dividers, empty states

  // Ink (text + line work)
  ink:         '#1B2235',  // oklch(22% 0.03 255)  — body, headings
  inkMuted:    '#5B6478',  // oklch(48% 0.02 255)  — secondary text
  inkSoft:     '#8B92A1',  // oklch(64% 0.02 255)  — captions, metadata
  inkGhost:    '#C8CCD3',  // oklch(82% 0.01 255)  — placeholder, disabled

  // Accent — the single warm focal color (record button, key highlights)
  ember:       '#E8845A',  // oklch(70% 0.16 38)   — primary accent, warm sunset
  emberDeep:   '#C26A45',  // oklch(60% 0.15 38)   — pressed / active state
  emberSoft:   '#F5C7B0',  // oklch(85% 0.07 38)   — accent fills, glows
  emberWash:   '#FBE8DC',  // oklch(93% 0.03 38)   — recording-active background tint

  // Semantic — muted, never garish
  sage:        '#88B8A1',  // oklch(72% 0.07 165)  — success / saved
  sageSoft:    '#D4E4DA',  // oklch(89% 0.04 165)
  wheat:       '#DDC58E',  // oklch(82% 0.08 85)   — caution / important-field marker
  rust:        '#B86F5A',  // oklch(60% 0.10 30)   — error, used sparingly

  // Tints (use as overlays at 8–14% opacity for atmosphere)
  tintWarm:    '#E8845A',  // ember
  tintCool:    '#9CB4C2',  // soft sea-glass for distant atmosphere
} as const
```

**Rules:**
- One dominant warm tone; only ember has chroma > 0.10 in normal use
- Never two accents on screen at once — choose
- Errors use rust, never red; success uses sage, never green

### Typography

Two faces. Both available as free Google Fonts via `@expo-google-fonts/fraunces` and `@expo-google-fonts/inter`.

```ts
export const type = {
  // Display — Fraunces variable, SOFT axis at 80, optical size matches use
  // Used for: schema names, record titles, hero numbers, query answers
  display: {
    family: 'Fraunces',
    soft: 80,           // OpenType SOFT axis (0–100); 80 = generous, hand-felt
    opsz: 'auto',       // optical size scales with px
  },

  // Body — Inter (variable). Tabular numerals on for any data display.
  body: {
    family: 'Inter',
    weight: { regular: 400, medium: 500, semibold: 600 },
    features: ['tnum', 'cv11'],  // tabular numerals + single-storey 'a' for warmth
  },

  // Scale — generous on mobile, minimum 17 for body
  size: {
    micro:  12,   // metadata, timestamps
    small:  14,   // labels
    body:   17,
    lead:   19,   // emphasized body
    title:  24,   // section titles
    head:   32,   // screen heads
    hero:   48,   // record cards, query answers
    grand:  72,   // active recording state, single-number displays
  },

  line: {
    tight: 1.1,   // hero / grand
    snug:  1.25,  // titles
    body:  1.5,   // body, lead
    loose: 1.7,   // long-form prose (rare)
  },

  track: {       // letter-spacing
    tight: -0.5, // grand, hero
    snug:  -0.2, // head, title
    body:  0,
    wide:  0.4,  // micro labels in caps
  },
} as const
```

**Pairing rules:**
- Fraunces for any value the user will remember (species name, fish length, sale price, query answer)
- Inter for chrome (tabs, buttons, field labels, timestamps)
- Never Fraunces for UI controls — it loses legibility at small sizes
- Never all-caps body text. Caps allowed only for `micro` labels with `wide` tracking

### Spacing

A 4-based rhythm, but with two "breath" tokens that override the linear ramp where the design wants air:

```ts
export const space = {
  hair: 2,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  breath:  64,   // section gaps, the kind that feel intentional
  silence: 96,   // top of screen → first content; rare, deliberate
} as const
```

Default screen padding: `lg` (24) horizontal. Pull to `xl` (32) on screens that lead with type.

### Radius

Soft and consistent. Nothing sharp.

```ts
export const radius = {
  sm:    8,   // small chips, micro buttons
  md:    16,  // inputs, secondary buttons
  lg:    24,  // primary cards (FieldCard, RecordCard)
  xl:    32,  // modals, schema selector cards
  pill:  999, // BigButton, pill chips
} as const
```

No 0-radius. Even dividers are mist-colored hairlines, never hard 1px borders.

### Shadow / Elevation

RN-compatible. Warm-tinted shadows, never neutral grey. Tint comes from a low-saturation ember.

```ts
export const elevation = {
  // Resting card — barely there
  rest: {
    shadowColor: '#3A2418',          // warm brown undertone
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,                    // Android
  },
  // Lifted — record button at rest, modal sheet
  lift: {
    shadowColor: '#3A2418',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  // Active — recording, the hero state
  active: {
    shadowColor: '#C26A45',          // emberDeep tint
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 12,
  },
} as const
```

### Motion

All motion uses `react-native-reanimated` springs unless noted. **No linear easings anywhere.**

```ts
export const motion = {
  // Springs — characterful, not snappy
  gentle:  { damping: 18, stiffness: 120, mass: 1 },   // default for state changes
  buoyant: { damping: 14, stiffness: 90,  mass: 1.1 }, // record button, breathing
  settle:  { damping: 22, stiffness: 180, mass: 1 },   // dismissal, modal close

  // Durations (when spring isn't appropriate — text fades, opacity)
  quick: 180,
  base:  280,
  slow:  500,
  breath: 2400,    // idle pulse cycle on record button

  // Easings (rare — prefer springs)
  out: 'easeOutCubic',
  inOut: 'easeInOutCubic',
} as const
```

**Motion principles:**
1. **Things settle, they don't snap.** Springs slightly underdamped for organic feel.
2. **Idle is alive.** The record button breathes. The mic icon gently pulses when listening. Nothing on screen is frozen.
3. **One hero moment per screen.** Most transitions are quiet. The record button's expansion into recording state is the one moment that performs.
4. **Match physics to material.** Field-fill is a wash (opacity + color sweep, ~500ms). Record button is springy. Page transitions are slow and considered, not zippy.

---

## Component Primitives

### Surface

The base layer. A `paper` background with a near-invisible noise texture overlay (8% opacity, generated SVG noise or static PNG) and a single soft radial gradient at the top of the screen suggesting morning light from above.

```
┌──────────────────────────────────┐
│  ░░░░░░░░░░ soft warm haze       │   <- radial gradient, ember 6%
│                                  │
│  paper bg with subtle grain      │
│                                  │
└──────────────────────────────────┘
```

### FieldCard

The atom of the record screen. A pill-rounded surface (radius `lg`), `cream` background, `lift` elevation while empty/active, `rest` once filled.

- **Empty state:** field label in `body` Inter, `inkMuted`. A single pulsing dot left-aligned at the top of the card when the schema mark this field as listening-active. Important fields show a 3px `wheat` stripe along the left edge (inset, not full-bleed).
- **Filled state:** value in Fraunces `lead`, `ink`. Label demotes to `micro` caps, `inkSoft`, top-left. Card slides smoothly to the bottom of the list (spring `gentle`) and fades to `paper` background, removing its lift.
- **Validation rejection (T032):** card briefly flashes `rust` 6% wash for 280ms, then settles back to empty state. Field label gets a one-line caption in `inkMuted` micro: "didn't catch that — try again."

### BigButton (Record / Mic)

The hero. A perfect circle, 168px diameter at rest, `pill` radius, `ember` background, `lift` elevation.

- **Idle:** breathes — scale 1.0 → 1.02 → 1.0 over `breath` (2400ms) infinite, `buoyant` spring. Inner microphone glyph in `paper`, drawn with single-stroke roundness.
- **Press in:** scales to 0.96, shadow tightens, accent shifts to `emberDeep`, haptic `medium`.
- **Recording active:** expands to 200px, switches to `active` elevation (warm ember glow), inner glyph becomes a soft waveform that responds to amplitude. Concentric ripples emanate every ~1.6s — soft `emberSoft` rings at 0.2 opacity, scaling 1.0 → 2.4 over 1800ms, fading out. The screen background tints to `emberWash` over `slow` duration.
- **"Done" detected or stop pressed:** ripples one final time, button collapses to 80px and slides to top-right corner of the screen (becomes the "review" pill); meanwhile the field cards reflow.

### PillSelector

For schema choice. Horizontal stack of two large rounded rectangles (radius `xl`), `paperDeep` background. Active pill gets `cream` fill, `lift` elevation, and a soft 6% `ember` border-glow. Inactive pills are flat `paperDeep`. Type: schema name in Fraunces `title`, soft optical, `ink`. Beneath: `micro` caps Inter showing field count, `inkSoft`.

### ToastQuiet

Used for offline queue notices ("queued — will retry"), validation hints, save confirmations. A pill (`pill` radius) at the bottom of the safe area, 80% paper with a 4px ember stripe inside the leading edge, `lift` elevation. Inter `small`, `ink`. Slides up on `gentle` spring, dwells 3s, slides down on `settle`.

Never red. Never a full-width banner. Never modal.

---

## Screens

### Record (default tab)

The home of the app. The screen the user sees when they open it on a boat with one wet hand.

```
┌──────────────────────────────────┐
│  Fishing                    ⌄   │   <- schema name, Fraunces head; tap to switch
│  4 fields · 2 important         │   <- Inter micro caps, inkSoft
│                                  │
│   ╭────────────────────────╮    │
│   │ ▎ Species             ·│    │   <- important: wheat stripe, pulsing dot
│   ╰────────────────────────╯    │
│   ╭────────────────────────╮    │
│   │ ▎ Length              ·│    │
│   ╰────────────────────────╯    │
│   ╭────────────────────────╮    │
│   │   Notes                │    │
│   ╰────────────────────────╯    │
│                                  │
│   ··· filled ───────────────    │   <- mist hairline divider with caption
│                                  │
│   ╭────────────────────────╮    │
│   │ LOCATION               │    │   <- filled: micro caps label
│   │ Cherry Cove dock       │    │   <- value: Fraunces lead
│   ╰────────────────────────╯    │
│                                  │
│                                  │
│             ⬤                    │   <- BigButton, breathing
│                                  │
│           ◌  📷                  │   <- secondary: photo attach (left of mic)
└──────────────────────────────────┘
```

**Composition rules:**
- Schema name is left-aligned, generous `silence` padding from top
- Field cards stack vertically with `md` gap, `lg` horizontal padding from screen edge
- Filled fields demote *below* a hairline divider with a `micro` caps caption "filled"
- BigButton anchors the lower third — never centered; sits at horizontal center but vertically biased toward bottom (one-thumb reach)
- Photo-attach button is a small ghost button, `mist` background, left of the mic — present but quiet

### Albums

A journal of past entries, not a card grid.

```
┌──────────────────────────────────┐
│  Logbook                        │   <- Fraunces head
│  Fishing · 23 entries           │   <- micro caps + Fraunces, inline
│                                  │
│  ───── April 2026 ─────         │   <- mist hairline + caps date
│                                  │
│  Perch                          │   <- Fraunces hero, ink
│  14"  ·  Cherry Cove dock       │   <- Inter body, inkMuted
│  Apr 18 · 6:42pm                │   <- micro caps, inkSoft
│  ┌─────────┐                    │   <- photo: rounded lg, 56% screen width
│  │  fish   │                    │
│  └─────────┘                    │
│                                  │
│  ─────                          │   <- short hairline between entries
│                                  │
│  Bass                           │
│  ...                            │
└──────────────────────────────────┘
```

**Rules:**
- Type-led — species/item name is the largest thing on screen for that entry
- No card chrome — entries separated by short hairlines (40% width, left-aligned, `mist`)
- Date headers in micro caps with horizontal rules either side, `breath` margin above
- Photos: single image previewed at 56% screen width, rounded `lg`, soft `rest` shadow. Tap → record detail.
- Empty state for a schema: a single Fraunces `lead` line in `inkMuted`: *"Nothing logged yet. Press record on the journal tab to begin."*

### Record Detail

Full page treatment. The record as a finished journal entry.

- Generous top margin (`silence`)
- Hero: species/item in Fraunces `grand`, single line, breaks on small screens to two
- Below: a vertical list of fields as label/value pairs (label `micro` caps `inkSoft`, value Fraunces `lead` `ink`)
- Photos full-width, rounded `lg`, stacked with `md` gap
- Audio playback: a single quiet pill at the bottom — `mist` bg, `ink` waveform, tap to play. No "transcript" exposed unless tapped (then expands inline as Fraunces body, italic).
- Edit / delete in a quiet overflow menu in the top-right — never primary chrome

### Query

The conversational page. The user asks; the journal answers.

```
┌──────────────────────────────────┐
│  Ask the log.                   │   <- Fraunces head, inkMuted
│                                  │
│  "What was my biggest fish?"    │   <- the user's question, Fraunces lead, ink
│                                  │
│  ───                             │   <- short hairline, breath margin
│                                  │
│  A 17" largemouth bass,         │   <- the answer, Fraunces hero, ink, slow stream
│  caught at Mitchell Pond on     │
│  March 4th.                     │
│                                  │
│  ░ played aloud · tap to repeat│   <- micro caps, inkSoft
│                                  │
│              ⬤  (smaller)        │   <- BigButton variant, 96px
└──────────────────────────────────┘
```

**Rules:**
- Question echoes the user's transcript verbatim — feels like a kept exchange
- Answer streams in word-by-word at conversational pace (~120ms per word), not character-by-character. Each word fades in with a 280ms quick easing.
- TTS plays simultaneously; an `inkSoft` line below the answer notes "played aloud"
- Empty state: single Fraunces `lead` line: *"Ask anything about your records."*

### Schema Selector

Reached from the schema name on the Record screen. A modal sheet, not a route.

- Sheet rises from the bottom on `gentle` spring, rounded `xl` top corners, `lift` elevation, `paperDeep` background
- Two PillSelector cards stacked vertically with `lg` gap
- Each pill shows: schema name (Fraunces title), a one-line description in Inter body inkMuted, and field count in micro caps
- A subtle decorative motif on the right edge of each pill — a single hand-drawn SVG glyph, `inkGhost`: a wave for Fishing, a small sun for Art Show. 28x28, 1.5px stroke, soft terminals.
- Selecting a pill: gentle haptic, the chosen pill briefly scales to 1.02 with `buoyant` spring, then the sheet dismisses and the Record screen's schema name updates with a soft cross-fade.

---

## Atmosphere & Texture

- **Paper grain:** an SVG noise overlay (or pre-baked PNG) at 6–8% opacity over the full app background. Critical for avoiding the flat-AI-UI look.
- **Top haze:** a single radial gradient anchored ~10% from the top, ember 6% center fading to transparent at 50% screen height. Suggests warm light without resorting to a "gradient hero."
- **No drop-shadows on text. Ever.**
- **No glassmorphism on screens.** The schema-selector sheet is the one place where a very subtle blur is permitted (BlurView, intensity 18, tint warm) — and only over the dimmed Record screen behind it.

---

## Iconography

- Style: single-stroke, 1.5px, soft round terminals. Hand-drawn feel, not pixel-perfect geometric.
- Source: Phosphor Icons (`thin` weight) as a baseline, then customize the few app-specific glyphs (microphone, wave, sun, fish silhouette) as inline SVG.
- Color: `ink` for primary, `inkMuted` for secondary, `inkSoft` for tertiary. Never colored in the accent — accent is reserved for the BigButton.
- Size: 24px standard, 20px in dense rows, 32px on the photo-attach button.

---

## Tabs / Navigation

A floating tab bar — not a flat strip glued to the bottom edge.

- Three tabs: **Journal** (record), **Logbook** (albums), **Ask** (query)
- Background: `paper` with `lift` elevation, rounded `pill` radius, floating `lg` from the bottom safe area
- Labels: Inter micro caps, `inkMuted`. Active tab: Fraunces small, `ink`, no underline — the type itself signals selection.
- No icon-only tabs. The words are part of the design.

---

## Accessibility

- All interactive elements: explicit `accessibilityLabel` and `accessibilityRole`. The BigButton announces "Record. Double-tap to start" / "Recording. Double-tap to stop."
- Color contrast verified for ink-on-paper, ink-on-cream, paper-on-ember: all ≥ 4.5:1 for body text, 3:1 for large display text.
- `prefersReducedMotion` honored: the breathing idle pauses, ripples become a single static halo, page transitions become quick cross-fades. Springs collapse to 180ms eases.
- Dynamic Type respected on iOS; all type tokens scale.
- VoiceOver: when recording, partial transcripts are announced via `accessibilityLiveRegion="polite"` so a blind user can hear what was understood.
- Field-fill animations include a non-motion signal (haptic light tick + audible chime at low volume on iOS only) so motion isn't load-bearing.

---

## Don't (anti-patterns specific to this app)

- ❌ Fishing/maritime clichés: rope dividers, leather textures, brass fittings, anchor logos in chrome, navy-blue-on-white nautical palette
- ❌ A "voice waveform" splashed across the screen during recording — too tech, too loud. The ripple is enough.
- ❌ Multiple competing accent colors. There is one warm color. There are no purples, no blues used for "info."
- ❌ Skeuomorphic notebook page edges, deckle edges, or "torn paper" SVGs.
- ❌ Sharp corners anywhere except the hairline dividers.
- ❌ Drop shadows from below-only — shadows here are radial-warm, suggesting candle/firelight, not a fluorescent ceiling.
- ❌ Spinners. Use the breathing button or a soft pulsing ellipsis.

---

## Quality Gate

Before marking any screen done, verify:

1. **Point of view is obvious** — a stranger looking at a screenshot would describe the app as "warm, journal-like, soft, intentional," not "another React Native app."
2. **Type and spacing feel deliberate** — no mid-paragraph orphan widows; no labels crammed against values; no buttons crammed against safe areas.
3. **Motion supports comprehension** — every animation answers a question ("which field just filled?", "is it listening?", "did it save?"). No motion exists for its own sake.
4. **One hero moment** — only the BigButton performs. Everything else is quiet.
5. **Production-grade** — not a demo. Real empty states, real error states, real edge cases (long names, missing photos, offline mode) all designed-through, not placeholdered.
6. **Could exist in 5 years** — no trend dependence (no glassmorphism beyond the one schema-sheet, no neumorphism, no current-year-only typography).

---

## Implementation hooks

- Tokens live in `src/styles/tokens.ts`
- Type styles exposed as preset components: `<DisplayHero>`, `<DisplayLead>`, `<BodyMd>`, `<MicroCaps>` so screens never reach for raw `fontSize` values
- Motion springs imported from `src/styles/motion.ts`
- The BigButton, FieldCard, and PillSelector live in `src/components/primitives/` — all other components compose these

The design system carries the weight. Screens should be short files.
