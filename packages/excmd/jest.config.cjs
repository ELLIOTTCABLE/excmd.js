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

   // TEMP: Override the default, and force babel-jest to transform `bs-platform`'s broken ESModules
   //       (until <https://github.com/rescript-lang/rescript-compiler/pull/4902> lands in
   //       `bs-platform@v9.0.0`, at least.)
   moduleDirectories: ['node_modules'],
   transformIgnorePatterns: [
      'node_modules/(?!bs-platform/lib/es6|bs-gen|bs-deriving|bs-sedlex|bs-uchar)',
   ],
}

