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

   // TEMP: Override the default, and force babel-jest to transform `bs-platform`'s broken ESModules
   //       (until <https://github.com/rescript-lang/rescript-compiler/pull/4902> lands in
   //       `bs-platform@v9.0.0`, at least.)
   moduleDirectories: ['node_modules'],
   transformIgnorePatterns: [
      'node_modules/(?!bs-platform/lib/es6|bs-gen|bs-deriving|bs-sedlex|bs-uchar)',
   ],
}
