const { createDefaultPreset, pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.json')

const defaultPreset = createDefaultPreset()

/** @type {import("ts-jest").JestConfigWithTsJest} **/
module.exports = {
  ...defaultPreset,
  roots: ['<rootDir>'],
  moduleDirectories: ['node_modules'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/'
  }),
  setupFiles: ['jest-webextension-mock']
}
