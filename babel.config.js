module.exports = function (api) {
  const isTest =
    api.caller((caller) => Boolean(caller && caller.name === 'babel-jest')) ||
    process.env.NODE_ENV === 'test' ||
    process.env.BABEL_ENV === 'test';
  api.cache.using(() => String(isTest));
  return {
    presets: [
      isTest ? ['babel-preset-expo', { reanimated: false, worklets: false }] : 'babel-preset-expo',
    ],
    plugins: isTest ? [] : ['react-native-reanimated/plugin'],
  };
};
