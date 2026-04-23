// Expo config plugin: handle SEND intents (shared URLs from WeChat, etc.)
// Extracts shared text from Android SEND intent and converts to sparknoteai:// deep link

const { withMainActivity } = require('@expo/config-plugins');

module.exports = function withShareIntent(config) {
  return withMainActivity(config, (newConfig) => {
    const mainActivity = newConfig.modResults.contents;

    // Add imports at the top
    const importsToAdd = `
import android.content.Intent
import android.net.Uri
`;

    // Add imports
    const withImports = mainActivity.replace(
      /^package com\.sparknoteai\.app/m,
      '$&\n' + importsToAdd
    );

    // Add onNewIntent override before the last closing brace
    const shareIntentCode = `
  private var shareIntentHandled = false

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    shareIntentHandled = false
    handleIntent(intent)
  }

  override fun onStart() {
    super.onStart()
    if (!shareIntentHandled) {
      handleIntent(intent)
    }
  }

  private fun handleIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.action
    val type = intent.type

    // 处理 SEND 动作（从微信等平台分享）
    if (Intent.ACTION_SEND == action && type?.startsWith("text/") == true) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (sharedText != null) {
        val url = extractUrl(sharedText)
        if (url != null) {
          shareIntentHandled = true
          val deepLink = "sparknoteai://import?url=\${Uri.encode(url)}"
          val deepIntent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
          startActivity(deepIntent)
          return
        }
      }
    }

    // 处理 VIEW 动作（http/https URL）
    if (Intent.ACTION_VIEW == action) {
      val data = intent.data
      if (data != null && (data.scheme == "http" || data.scheme == "https")) {
        val host = data.host ?: return
        val port = data.port
        if (host == "localhost" || host == "127.0.0.1" ||
            port == 8081 || port == 8000 ||
            host.matches(Regex("192\\\\.168\\\\..+"))) return
        shareIntentHandled = true
        val deepLink = "sparknoteai://import?url=\${Uri.encode(data.toString())}"
        val deepIntent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
        startActivity(deepIntent)
      }
    }
  }

  private fun extractUrl(text: String): String? {
    if (text.matches(Regex("https?://.*"))) return text
    val urlPattern = Regex("https?://[^\\\\s\\\\>\\\\)]+")
    val match = urlPattern.find(text)
    return match?.value
  }
`;

    // Find the position of the last closing brace
    const lastBraceIndex = withImports.lastIndexOf('}');
    if (lastBraceIndex === -1) return newConfig;

    const finalContent =
      withImports.slice(0, lastBraceIndex) +
      shareIntentCode +
      '\n' +
      withImports.slice(lastBraceIndex);

    newConfig.modResults.contents = finalContent;
    return newConfig;
  });
};
