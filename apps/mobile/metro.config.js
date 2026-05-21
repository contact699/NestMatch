// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Append the monorepo root so hoisted packages (e.g. reanimated) are found
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// In a monorepo, Metro's default resolution walks UP from each file looking
// for node_modules. Files inside the root node_modules walk up and find the
// root's react@19.2.3 (hoisted from apps/web) BEFORE Metro consults
// nodeModulesPaths. Result: two copies of React in the bundle, ExpoRoot
// throws "Cannot read property 'useMemo' of null".
//
// disableHierarchicalLookup forces Metro to only consult nodeModulesPaths
// below (with apps/mobile first), so react always resolves to mobile's
// local copy.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure only one copy of react / react-native is used (the mobile-local one)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
