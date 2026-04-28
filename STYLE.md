# Style Guide

## Language & Runtime

- **TypeScript** 5.x with `strict: true`, `noUncheckedIndexedAccess: true`
- **React Native** via **Expo** SDK 51+
- **Node** 20+ for tooling
- **Package manager:** npm (lockfile committed). Switch to pnpm only if the team agrees.

## Linting & Formatting

- **ESLint** with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-native`, `eslint-plugin-import`
- **Prettier** for formatting
- Configs: `.eslintrc.cjs`, `.prettierrc`, `tsconfig.json`
- Pre-commit: `lint-staged` runs prettier + eslint on staged files

### How to lint

```sh
npm run lint            # eslint . --ext .ts,.tsx
npm run lint:fix        # eslint . --ext .ts,.tsx --fix
npm run format          # prettier --write .
npm run typecheck       # tsc --noEmit
```

### How to check lint in CI

```sh
npm run typecheck && npm run lint && npm test
```

CI is wired in T034.

## Code Conventions

### File organization

- Organize by feature/domain under `src/` — many small files beats few large ones
- 200–400 lines typical; **800 max** (writes over 800 lines are blocked)
- Co-locate component, styles, and tests where reasonable
- One default export per file for components; named exports for utilities and hooks

### Naming

- **Components:** PascalCase (`LiveChecklist`, `BigRecordButton`)
- **Hooks:** `use` prefix (`useVoiceSession`, `useActiveSchema`)
- **Repositories / Services:** PascalCase suffixed (`SchemaRepository`, `WhisperService`)
- **Store slices:** `camelCaseSlice` (`activeSchemaSlice`)
- **Constants:** `UPPER_SNAKE_CASE`
- **Booleans:** `is` / `has` / `should` / `can` prefix
- **Types & interfaces:** PascalCase, no `I` prefix

### Imports

Order (auto-sorted by `eslint-plugin-import`):

1. Node / external packages
2. Absolute internal (`src/db/...`)
3. Relative (`./...`)
4. Styles / asset imports

### State

- **Zustand** for client/app state. Slices defined in `src/store` (WS1).
- **No** TanStack Query in MVP — there's no server state.
- URL state via expo-router segments where relevant.
- Component state via `useState` for UI-only concerns; lift to Zustand when shared.

### Async

- `async/await` everywhere. No raw `Promise` chains.
- Never silently swallow errors — surface via toast/alert in UI, log to console in dev.
- All async repository methods return immutable result objects.

### Immutability

- No in-place mutation of objects/arrays — use spread/copy
- Prefer `readonly` on type definitions where it adds clarity
- Zustand setters use the functional form when reading prior state

### Error handling

- Throw typed errors from services (`SchemaValidationError`, `ExtractionNetworkError`, etc.)
- Catch at the UI boundary; convert to user-friendly toasts
- Validate at system boundaries (user input, GPT-4o responses, file system, network)

## Commit Style

- **Conventional commits:** `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `perf:`, `ci:`
- Branch naming: `T###-<short-slug>` to map back to the bd issue (e.g. `T001-init-expo`)
- Co-authored-by trailers per repo settings

## React Native specifics

### Animation

- Compositor-friendly only: `transform`, `opacity`. Avoid animating layout-bound props.
- Prefer `react-native-reanimated` for non-trivial motion; `Animated` API for simple cases.

### Styling

- `StyleSheet.create` colocated at the bottom of each component file
- Design tokens (colors, spacing, type scale) live in `src/styles/tokens.ts`
- Don't hardcode palette or spacing in component files

### Accessibility

- Every interactive element has `accessibilityLabel` and an appropriate `accessibilityRole`
- Test screen-reader flow on at least one screen per workstream
- Support reduced motion via `useReducedMotion`

## Testing

- **Jest** + **@testing-library/react-native** (T033)
- Unit tests for repositories, services, hooks, validation
- Component tests for non-trivial UI (LiveChecklist, modal flows)
- Mock native modules (whisper.rn, expo-sqlite) at the seam, not in every test
- Coverage target: 80% (warning during early development, enforced once critical path lands)

## Comments

- Default to writing none. Names should explain themselves.
- Write a comment only when the *why* is non-obvious (a workaround, a hidden constraint, a surprising decision)
- Don't explain *what* the code does; the code already does that
