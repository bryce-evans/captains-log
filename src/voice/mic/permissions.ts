import { Audio } from 'expo-av';

import { MicPermissionDeniedError } from '../errors';

export type MicPermissionState = 'granted' | 'denied' | 'undetermined';

interface PermissionResult {
  readonly status: string;
  readonly canAskAgain?: boolean;
}

type MaybeAudio = typeof Audio & {
  getPermissionsAsync?: () => Promise<PermissionResult>;
};

export async function getMicPermissionState(): Promise<MicPermissionState> {
  const audio = Audio as MaybeAudio;
  const reader = audio.getPermissionsAsync ?? audio.requestPermissionsAsync;
  const result = (await reader()) as PermissionResult;
  if (result.status === 'granted') {
    return 'granted';
  }
  if (result.status === 'denied') {
    return 'denied';
  }
  return 'undetermined';
}

export async function requestMicPermissions(): Promise<boolean> {
  const result = (await Audio.requestPermissionsAsync()) as PermissionResult;
  if (result.status === 'granted') {
    return true;
  }
  if (result.status === 'denied' && result.canAskAgain === false) {
    throw new MicPermissionDeniedError(
      'Microphone permission denied permanently. Enable it in system settings.',
    );
  }
  return false;
}
