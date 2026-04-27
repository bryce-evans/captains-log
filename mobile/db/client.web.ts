// Web platform: expo-sqlite requires WASM which isn't available in the web bundle.
// Export a null client — the store checks dbReady before using DB operations.
export async function getDb(): Promise<never> {
  throw new Error('SQLite not available on web — use native build');
}
