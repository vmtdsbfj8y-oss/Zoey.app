module.exports = function (api) {
  api.cache(true);
  return {
    // NOTE: no worklets/reanimated plugin here on purpose -- babel-preset-expo
    // injects `react-native-worklets/plugin` itself when the package is
    // installed. Adding it manually double-applies it and breaks Reanimated.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
