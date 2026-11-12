module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // `@/...` so a screen two folders deep does not import through ../../..
      ['module-resolver', { alias: { '@': './src' }, extensions: ['.ts', '.tsx', '.js', '.json'] }],
    ],
  };
};
