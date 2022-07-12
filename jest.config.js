const tsconfig = require('./tsconfig.json')
const { pathsToModuleNameMapper } = require('ts-jest')

module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [],
  testRegex: '^.+\\.test.tsx?$',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, {
    prefix: '<rootDir>/'
  }),
  setupFiles: ['jest-webextension-mock']
}
