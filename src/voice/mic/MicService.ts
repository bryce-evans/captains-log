import { Audio } from 'expo-av';
import {
  AndroidAudioEncoder,
  AndroidOutputFormat,
  IOSAudioQuality,
  IOSOutputFormat,
} from 'expo-av/build/Audio/RecordingConstants';

import { MicPermissionDeniedError, MicSessionError } from '../errors';

import { subscribeToInterruptions } from './interruptions';
import { requestMicPermissions } from './permissions';

export interface MicChunk {
  readonly uri: string;
  readonly index: number;
  readonly durationMs: number;
}

export interface StartRecordingOptions {
  readonly onChunk?: (chunk: MicChunk) => void;
  readonly chunkDurationMs?: number;
}

export interface StopRecordingResult {
  readonly uri: string;
  readonly durationMs: number;
}

export interface MicService {
  requestPermission(): Promise<boolean>;
  startRecording(opts?: StartRecordingOptions): Promise<void>;
  stopRecording(): Promise<StopRecordingResult>;
  isRecording(): boolean;
  cleanup(): Promise<void>;
}

interface RecordingHandle {
  stopAndUnloadAsync: () => Promise<void>;
  getURI: () => string | null;
}

interface RecordingFactory {
  createAsync(options: unknown): Promise<{ recording: RecordingHandle }>;
}

const SIXTEEN_K_RECORDING_OPTIONS: Record<string, unknown> = {
  isMeteringEnabled: false,
  android: {
    extension: '.wav',
    outputFormat: AndroidOutputFormat.DEFAULT,
    audioEncoder: AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/wav',
    bitsPerSecond: 256000,
  },
};

export class ExpoAvMicService implements MicService {
  private current: RecordingHandle | null = null;
  private chunkTimer: ReturnType<typeof setTimeout> | null = null;
  private chunkIndex = 0;
  private startedAt = 0;
  private recording = false;
  private chunkOptions: StartRecordingOptions | null = null;
  private unsubscribeInterruption: (() => void) | null = null;
  private previousAudioMode: { allowsRecordingIOS: boolean; playsInSilentModeIOS: boolean } | null =
    null;

  async requestPermission(): Promise<boolean> {
    const granted = await requestMicPermissions();
    if (!granted) {
      throw new MicPermissionDeniedError();
    }
    return true;
  }

  async startRecording(opts?: StartRecordingOptions): Promise<void> {
    if (this.recording) {
      throw new MicSessionError('startRecording called while already recording');
    }
    await this.configureAudioSession();
    this.chunkOptions = opts ?? null;
    this.chunkIndex = 0;
    this.startedAt = Date.now();
    this.recording = true;
    this.unsubscribeInterruption = subscribeToInterruptions(() => {
      void this.handleInterruption();
    });
    await this.beginNewSegment();
  }

  async stopRecording(): Promise<StopRecordingResult> {
    if (!this.recording || !this.current) {
      throw new MicSessionError('stopRecording called without an active recording');
    }
    this.clearChunkTimer();
    const handle = this.current;
    this.current = null;
    this.recording = false;
    let uri: string;
    try {
      await handle.stopAndUnloadAsync();
      uri = handle.getURI() ?? '';
    } catch (err) {
      throw new MicSessionError('Failed to stop recording', err);
    }
    const durationMs = Date.now() - this.startedAt;
    this.chunkOptions = null;
    if (this.unsubscribeInterruption) {
      this.unsubscribeInterruption();
      this.unsubscribeInterruption = null;
    }
    await this.restoreAudioSession();
    return { uri, durationMs };
  }

  isRecording(): boolean {
    return this.recording;
  }

  async cleanup(): Promise<void> {
    this.clearChunkTimer();
    if (this.current) {
      try {
        await this.current.stopAndUnloadAsync();
      } catch {
        // Ignore — we are tearing down on best-effort basis.
      }
    }
    this.current = null;
    this.recording = false;
    this.chunkOptions = null;
    if (this.unsubscribeInterruption) {
      this.unsubscribeInterruption();
      this.unsubscribeInterruption = null;
    }
    await this.restoreAudioSession();
  }

  private async beginNewSegment(): Promise<void> {
    const factory = (Audio as unknown as { Recording: RecordingFactory }).Recording;
    let handle: RecordingHandle;
    try {
      const created = await factory.createAsync(SIXTEEN_K_RECORDING_OPTIONS);
      handle = created.recording;
    } catch (err) {
      this.recording = false;
      throw new MicSessionError('Failed to start recording segment', err);
    }
    this.current = handle;
    if (this.chunkOptions?.onChunk && this.chunkOptions.chunkDurationMs) {
      const duration = this.chunkOptions.chunkDurationMs;
      this.chunkTimer = setTimeout(() => {
        void this.rotateSegment(duration);
      }, duration);
    }
  }

  private async rotateSegment(durationMs: number): Promise<void> {
    if (!this.current || !this.recording) {
      return;
    }
    const handle = this.current;
    this.current = null;
    let uri: string;
    try {
      await handle.stopAndUnloadAsync();
      uri = handle.getURI() ?? '';
    } catch (err) {
      this.recording = false;
      throw new MicSessionError('Failed to rotate recording segment', err);
    }
    const onChunk = this.chunkOptions?.onChunk;
    const index = this.chunkIndex;
    this.chunkIndex += 1;
    if (onChunk && uri) {
      onChunk({ uri, index, durationMs });
    }
    if (this.recording) {
      await this.beginNewSegment();
    }
  }

  private clearChunkTimer(): void {
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
  }

  private async configureAudioSession(): Promise<void> {
    this.previousAudioMode = { allowsRecordingIOS: false, playsInSilentModeIOS: false };
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (err) {
      throw new MicSessionError('Failed to configure audio session', err);
    }
  }

  private async restoreAudioSession(): Promise<void> {
    if (!this.previousAudioMode) {
      return;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: this.previousAudioMode.allowsRecordingIOS,
        playsInSilentModeIOS: this.previousAudioMode.playsInSilentModeIOS,
      });
    } catch {
      // best-effort — failure here only matters in dev logs
    }
    this.previousAudioMode = null;
  }

  private async handleInterruption(): Promise<void> {
    if (!this.recording) {
      return;
    }
    try {
      await this.stopRecording();
    } catch {
      // We already mark the session ended; swallow secondary error.
    }
  }
}

export function createMicService(): MicService {
  if (shouldUseStubMic()) {
    // Imported lazily so production bundles don't pull in stub paths.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MicStubService } = require('./MicStubService');
    return new MicStubService();
  }
  return new ExpoAvMicService();
}

function shouldUseStubMic(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  const flag = process.env.EXPO_PUBLIC_USE_MIC_STUB ?? process.env.EXPO_PUBLIC_USE_WHISPER_STUB;
  return flag === 'true';
}
