const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const existingAssetExts = config.resolver.assetExts ?? [];
config.resolver.assetExts = [
  ...new Set([
    ...existingAssetExts,
    'bin', // whisper.cpp ggml model
    'mil', // CoreML model (optional)
  ]),
];

module.exports = config;
