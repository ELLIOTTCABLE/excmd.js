module.exports = {
   presets: ['@babel/env'],
   overrides: [
      {
         test: 'packages/excmd/**/*',
         presets: ['@babel/env', '@babel/preset-typescript'],
         plugins: ['@babel/plugin-transform-runtime'],
      },
   ],
   babelrcRoots: ['.', './packages/*'],
}
