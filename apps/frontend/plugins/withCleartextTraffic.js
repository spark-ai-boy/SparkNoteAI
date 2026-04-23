// Expo config plugin: allow cleartext HTTP traffic on Android
// Required for connecting to local development servers (http://192.168.x.x:8000)

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (newConfig) => {
    const androidManifest = newConfig.modResults;
    const application = androidManifest.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return newConfig;
  });
};
