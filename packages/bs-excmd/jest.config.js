module.exports = {
   verbose: true,
   testEnvironment: 'node',
   testMatch: ['**/?(*.)+(spec|test).@(mj|cj|j|t)s?(x)'],
   testPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/_opam/',
      '<rootDir>/lib/bs/',
   ],
   collectCoverageFrom: [
      'src/**/*.js',
      '!src/parserAutomaton.bs.js',
      '!src/menhirLib.bs.js',
   ],
   coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/_opam/'],
   transform: {},
}
