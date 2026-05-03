/**
 * Design tokens — single source of truth for color, type, spacing, radius,
 * elevation, and motion. Mirrors DESIGN.md "Design Tokens" exactly.
 *
 * Never hardcode hex values, sizes, or spring configs in component files —
 * import from here.
 */

export const color = {
  // Surfaces
  paper: '#FBF8F2',
  paperDeep: '#F4EFE3',
  cream: '#F7F3EA',
  mist: '#EFEAE0',

  // Ink (text + line work)
  ink: '#1B2235',
  inkMuted: '#5B6478',
  inkSoft: '#8B92A1',
  inkGhost: '#C8CCD3',

  // Accent — single warm focal color
  ember: '#E8845A',
  emberDeep: '#C26A45',
  emberSoft: '#F5C7B0',
  emberWash: '#FBE8DC',

  // Semantic — muted, never garish
  sage: '#88B8A1',
  sageSoft: '#D4E4DA',
  wheat: '#DDC58E',
  rust: '#B86F5A',

  // Tints — apply at 8–14% opacity for atmosphere
  tintWarm: '#E8845A',
  tintCool: '#9CB4C2',
} as const;

export const type = {
  display: {
    family: 'Fraunces',
    soft: 80,
    opsz: 'auto',
  },
  body: {
    family: 'Inter',
    weight: { regular: 400, medium: 500, semibold: 600 },
    features: ['tnum', 'cv11'],
  },
  size: {
    micro: 12,
    small: 14,
    body: 17,
    lead: 19,
    title: 24,
    head: 32,
    hero: 48,
    grand: 72,
  },
  line: {
    tight: 1.1,
    snug: 1.25,
    body: 1.5,
    loose: 1.7,
  },
  track: {
    tight: -0.5,
    snug: -0.2,
    body: 0,
    wide: 0.4,
  },
} as const;

export const space = {
  hair: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  breath: 64,
  silence: 96,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const elevation = {
  rest: {
    shadowColor: '#3A2418',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  lift: {
    shadowColor: '#3A2418',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  active: {
    shadowColor: '#C26A45',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 12,
  },
} as const;

export const motion = {
  gentle: { damping: 18, stiffness: 120, mass: 1 },
  buoyant: { damping: 14, stiffness: 90, mass: 1.1 },
  settle: { damping: 22, stiffness: 180, mass: 1 },

  quick: 180,
  base: 280,
  slow: 500,
  breath: 2400,

  out: 'easeOutCubic',
  inOut: 'easeInOutCubic',
} as const;

export type ColorToken = keyof typeof color;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type ElevationToken = keyof typeof elevation;
