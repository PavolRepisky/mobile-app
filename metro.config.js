// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Phone-only modules that throw the moment they're imported in the browser,
 * taking the whole app down even though everything using them sits behind a
 * platform check: `@expo/ui/swift-ui` is SwiftUI ("requireNativeViewManager is
 * not available"), `expo-media-library` is the phone's Photos ("Cannot find
 * native module"). On the web they resolve to a stand-in instead, so the
 * imports load and the drawn fallbacks render.
 */
const PHONE_ONLY = /^(@expo\/ui\/swift-ui(\/.*)?|expo-media-library)$/;
const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && PHONE_ONLY.test(moduleName)) {
    return { type: 'sourceFile', filePath: path.resolve(__dirname, 'lib/webStub.js') };
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
