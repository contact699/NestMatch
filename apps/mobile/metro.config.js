// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Append the monorepo root so hoisted packages (e.g. reanimated) are found
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// Prefer the mobile app's local node_modules for packages like react,
// falling back to the monorepo root for hoisted deps
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

// Force every react / react-native import (including transitive ones from
// packages that live in the hoisted root node_modules) to resolve to the
// mobile workspace's local copy. Without this, files in root/node_modules
// walk up to find root/node_modules/react@19.2.3 (hoisted from apps/web),
// while mobile code uses 19.1.0 — two Reacts in one bundle break hooks
// with "Cannot read property 'useMemo' of null" inside ExpoRoot.
//
// resolveRequest intercepts only react itself; other modules (including
// expo-router's nested @react-navigation/native) fall through to Metro's
// default resolver, so hierarchical lookup still works for them.
const reactPkgs = new Set(['react', 'react-dom']);
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (reactPkgs.has(moduleName) || moduleName.startsWith('react/') || moduleName === 'react-native' || moduleName.startsWith('react-native/')) {
    const localPath = path.join(projectRoot, 'node_modules', moduleName);
    return context.resolveRequest({ ...context, originModulePath: path.join(projectRoot, 'index.js') }, moduleName, platform);
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
