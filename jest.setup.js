/* eslint-env jest */
require('@testing-library/jest-native/extend-expect');

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 0, longitude: 0, accuracy: 1 } }),
  ),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve(null)),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    setAudioModeAsync: jest.fn(),
    Recording: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          recording: {
            stopAndUnloadAsync: jest.fn(),
            getURI: jest.fn(() => 'file:///mock/audio.wav'),
            getStatusAsync: jest.fn(() => Promise.resolve({ isRecording: true })),
          },
        }),
      ),
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
      LOW_QUALITY: {},
    },
  },
}));

jest.mock('expo-file-system', () => require('./src/test/fileSystemMock'));
jest.mock('expo-file-system/legacy', () => require('./src/test/fileSystemMock'));

jest.mock('expo-sqlite', () => {
  const { getActiveFakeDb } = require('./src/test/inMemoryDb');
  return {
    openDatabaseAsync: jest.fn(() => Promise.resolve(getActiveFakeDb())),
    openDatabaseSync: jest.fn(() => getActiveFakeDb()),
    deleteDatabaseAsync: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => () => undefined),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
  return Reanimated;
});

global.__DEV__ = true;
