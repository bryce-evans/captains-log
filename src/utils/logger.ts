/**
 * Lightweight dev-only logger. Production builds (`__DEV__ === false`) no-op
 * so we don't spam release-mode logcat / xcode console with framework noise.
 *
 * - `logger.warn(msg, ctx?)` mirrors `console.warn` in dev, silent in prod
 * - `logger.error(msg, err?)` mirrors `console.error` in dev, silent in prod
 *
 * `__DEV__` is the React Native global. We probe it through `globalThis` so
 * Node-based unit tests (where `__DEV__` is undefined) still log if a test
 * happens to invoke the logger.
 */

type GlobalWithDev = typeof globalThis & { __DEV__?: boolean };

function isDev(): boolean {
  const g = globalThis as GlobalWithDev;
  if (typeof g.__DEV__ === 'boolean') {
    return g.__DEV__;
  }
  // Node / jest / web fallback — treat as dev so logs surface during tests.
  return true;
}

export const logger = {
  warn(message: string, context?: unknown): void {
    if (!isDev()) {
      return;
    }
    if (context === undefined) {
      // eslint-disable-next-line no-console
      console.warn(message);
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(message, context);
  },
  error(message: string, error?: unknown): void {
    if (!isDev()) {
      return;
    }
    if (error === undefined) {
      // eslint-disable-next-line no-console
      console.error(message);
      return;
    }
    // eslint-disable-next-line no-console
    console.error(message, error);
  },
} as const;
