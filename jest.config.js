/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-native-reanimated|react-native-gesture-handler|react-native-svg|expo-modules-core|expo-router|@react-native-async-storage/.*|uuid)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/', '/render/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uuid$': require.resolve('uuid'),
  },
};
