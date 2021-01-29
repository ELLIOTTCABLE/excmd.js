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
                  useESModules: true,
                  version: '^7.8.3', // @babel/runtime version
               },
            ],
         ],
      },
   ],
   babelrcRoots: ['.', './packages/*'],
}
