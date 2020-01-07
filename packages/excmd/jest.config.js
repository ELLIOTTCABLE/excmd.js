module.exports = {
   verbose: true,
   testEnvironment: 'node',
   testPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/lib/bs/',
      '/_opam/',
   ],
   collectCoverageFrom: [
      'src/**/*.{js,ts}',
      '!<rootDir>/node_modules/**',
      '<rootDir>/node_modules/bs-excmd/src/**/*.js',
      '!<rootDir>/node_modules/bs-excmd/src/parserAutomaton.bs.js',
      '!<rootDir>/node_modules/bs-excmd/src/menhirLib.bs.js',
   ],
   coveragePathIgnorePatterns: ['/_opam/'],
   transform: {'\\.(js|ts)$': ['babel-jest', {rootMode: 'upward'}]},
}

