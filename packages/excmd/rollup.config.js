import ts from '@wessberg/rollup-plugin-ts'
import resolve from '@rollup/plugin-node-resolve'

function produceConfig({tsConfig, pathComponent}) {
   return {
      input: 'src/excmd.ts',
      plugins: [resolve(), ts(tsConfig)],
      output: [
         {
            file: `dist/excmd${pathComponent || ''}.js`,
            format: 'cjs',
         },
         {
            file: `dist/excmd${pathComponent || ''}.esm.js`,
            format: 'esm',
         },
      ],
   }
}

export default [
   produceConfig({
      tsConfig: {
         transpiler: 'babel',
         browserslist: ['last 1 version', '> 1%'],
      },
   }),
   produceConfig({
      tsConfig: {
         transpiler: 'babel',
         browserslist: 'last 5 Firefox versions',
      },
      pathComponent: '.ff',
   }),
]
