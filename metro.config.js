const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve modules from shared/
config.watchFolders = [path.resolve(__dirname, "shared")];

module.exports = config;
