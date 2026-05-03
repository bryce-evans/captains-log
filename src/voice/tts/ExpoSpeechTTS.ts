import * as Speech from 'expo-speech';

import type { TTSService } from '../QueryVoiceSession';

export class ExpoSpeechTTS implements TTSService {
  async speak(text: string): Promise<void> {
    if (!text) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      try {
        Speech.speak(text, {
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch {
      // best-effort
    }
  }
}

export function createTTSService(): TTSService {
  return new ExpoSpeechTTS();
}
