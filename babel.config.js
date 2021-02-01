module.exports = {
   presets: ['@babel/env'],
   overrides: [
      {
         test: 'packages/excmd/**/*',
         presets: ['@babel/env', '@babel/preset-typescript'],
         plugins: [
            [
               '@babel/plugin-transform-runtime',
               {
                  // TEMP: This should be re-enabled once we get `bs-platform@9.0.0`, which actually
                  //       ships proper `.mjs` files
                  // useESModules: true,

                  // NOTE: It's unclear if this value supports semver ranges or not; but I am
                  //       choosing to duplicate the value from `package.json` precisely.
                  //
                  //       See: <https://github.com/babel/babel/blob/9808d2/packages/babel-plugin-transform-runtime/src/helpers.js#L4-L33>
                  version: '~7.12.5', // @babel/runtime version
               },
            ],
         ],
      },
      {
         test: 'packages/excmd/examples/**/*',
         presets: [
            [
               '@babel/env',
               {
                  targets: {node: '12'},

                  // preserve ESModules intact
                  modules: false,
               },
            ],
         ],
      },
   ],
   babelrcRoots: ['.', './packages/*'],
}
