module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
  };
};
