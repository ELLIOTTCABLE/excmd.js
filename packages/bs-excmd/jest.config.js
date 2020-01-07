module.exports = {
   verbose: true,
   testEnvironment: 'node',
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
   transform: {'\\.js$': ['babel-jest', {rootMode: 'upward'}]},
}
