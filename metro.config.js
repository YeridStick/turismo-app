const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Agregamos el filtro para ignorar las carpetas de Android que causan el error ENOENT
config.resolver.blockList = [
  /android\/build\/.*/,
  /android\/.cxx\/.*/,
  /node_modules\/.*\/android\/.cxx\/.*/,
];

// 2. Aseguramos que Metro no se pierda buscando en carpetas innecesarias
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
