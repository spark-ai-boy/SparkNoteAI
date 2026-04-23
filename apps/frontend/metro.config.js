const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  const { assetExts } = config.resolver;
  config.resolver.assetExts = [...assetExts, 'txt'];
  return config;
})();
