const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro has to be told about the monorepo.
 *
 * `@galokids/core` is a sibling workspace, not a published package, so Metro
 * needs the repository root on its watch list — otherwise an edit to a shared
 * type is invisible until the bundler restarts — and both node_modules folders
 * on its resolution path.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// SQLite on the web ships as WebAssembly, and Metro treats an unknown
// extension as a module to parse rather than a file to copy. Without this the
// web build fails on `import wasm from './wa-sqlite/wa-sqlite.wasm'`.
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
