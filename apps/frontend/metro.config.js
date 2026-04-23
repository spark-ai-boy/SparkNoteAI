const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  const { assetExts } = config.resolver;
  config.resolver.assetExts = [...assetExts, 'txt'];

  // 原生端构建时，将 md-editor-rt（仅 Web 使用）指向空 polyfill
  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform !== 'web' && moduleName === 'md-editor-rt') {
      return {
        filePath: path.resolve(__dirname, 'src/polyfills/md-editor-rt.js'),
        type: 'sourceFile',
      };
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
})();
