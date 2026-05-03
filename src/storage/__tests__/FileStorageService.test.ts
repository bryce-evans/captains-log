import {
  cleanupOrphans,
  ensureRecordDir,
  pathForAudio,
  pathForPhoto,
  pathForRecordDir,
} from '../FileStorageService';

// Pull the legacy mock to reset between tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fileSystem = require('expo-file-system/legacy') as {
  __reset?: () => void;
  writeAsStringAsync: (uri: string, contents: string) => Promise<void>;
  makeDirectoryAsync: (uri: string, opts?: object) => Promise<void>;
  getInfoAsync: (uri: string) => Promise<{ exists: boolean; isDirectory: boolean }>;
};

const DOC = 'file:///mock/documents/';

describe('FileStorageService', () => {
  beforeEach(() => {
    fileSystem.__reset?.();
  });

  it('builds audio path under records/<id>/audio.wav', () => {
    expect(pathForAudio('abc')).toBe(`${DOC}records/abc/audio.wav`);
  });

  it('builds photo path with index suffix', () => {
    expect(pathForPhoto('abc', 0)).toBe(`${DOC}records/abc/photo_0.jpg`);
    expect(pathForPhoto('abc', 3)).toBe(`${DOC}records/abc/photo_3.jpg`);
  });

  it('builds record dir path with trailing slash', () => {
    expect(pathForRecordDir('xyz')).toBe(`${DOC}records/xyz/`);
  });

  it('ensureRecordDir creates the directory', async () => {
    await ensureRecordDir('rec1');
    const info = await fileSystem.getInfoAsync(`${DOC}records/rec1/`);
    expect(info.exists).toBe(true);
  });

  it('cleanupOrphans deletes only unknown record dirs', async () => {
    // create three record dirs
    await fileSystem.makeDirectoryAsync(`${DOC}records/`);
    await fileSystem.makeDirectoryAsync(`${DOC}records/keep1/`);
    await fileSystem.makeDirectoryAsync(`${DOC}records/keep2/`);
    await fileSystem.makeDirectoryAsync(`${DOC}records/orphan/`);

    const deleted = await cleanupOrphans(['keep1', 'keep2']);
    expect(deleted).toBe(1);
    const orphanInfo = await fileSystem.getInfoAsync(`${DOC}records/orphan/`);
    expect(orphanInfo.exists).toBe(false);
    const keepInfo = await fileSystem.getInfoAsync(`${DOC}records/keep1/`);
    expect(keepInfo.exists).toBe(true);
  });

  it('cleanupOrphans returns 0 when records dir does not exist', async () => {
    const deleted = await cleanupOrphans([]);
    expect(deleted).toBe(0);
  });
});
