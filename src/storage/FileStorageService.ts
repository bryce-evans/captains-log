import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';

const RECORDS_DIR_NAME = 'records';

function ensureDocDir(): string {
  if (!documentDirectory) {
    throw new Error('documentDirectory is unavailable on this platform');
  }
  return documentDirectory;
}

function recordsRoot(): string {
  return `${ensureDocDir()}${RECORDS_DIR_NAME}/`;
}

export function pathForRecordDir(recordId: string): string {
  return `${recordsRoot()}${recordId}/`;
}

export function pathForAudio(recordId: string): string {
  return `${pathForRecordDir(recordId)}audio.wav`;
}

export function pathForPhoto(recordId: string, index: number): string {
  return `${pathForRecordDir(recordId)}photo_${index}.jpg`;
}

export async function ensureRecordDir(recordId: string): Promise<void> {
  const dir = pathForRecordDir(recordId);
  const info = await getInfoAsync(dir);
  if (info.exists && info.isDirectory) {
    return;
  }
  await makeDirectoryAsync(dir, { intermediates: true });
}

export async function deleteAudio(recordId: string): Promise<void> {
  const path = pathForAudio(recordId);
  const info = await getInfoAsync(path);
  if (!info.exists) {
    return;
  }
  await deleteAsync(path, { idempotent: true });
}

export async function deleteRecordFiles(recordId: string): Promise<void> {
  const dir = pathForRecordDir(recordId);
  const info = await getInfoAsync(dir);
  if (!info.exists) {
    return;
  }
  await deleteAsync(dir, { idempotent: true });
}

export async function cleanupOrphans(knownRecordIds: ReadonlyArray<string>): Promise<number> {
  const root = recordsRoot();
  const info = await getInfoAsync(root);
  if (!info.exists || !info.isDirectory) {
    return 0;
  }
  const entries = await readDirectoryAsync(root);
  const knownSet = new Set(knownRecordIds);
  let deleted = 0;
  for (const entry of entries) {
    if (knownSet.has(entry)) {
      continue;
    }
    await deleteAsync(`${root}${entry}`, { idempotent: true });
    deleted += 1;
  }
  return deleted;
}

export const FileStorageService = {
  pathForAudio,
  pathForPhoto,
  pathForRecordDir,
  ensureRecordDir,
  deleteAudio,
  deleteRecordFiles,
  cleanupOrphans,
} as const;
