import ts from '@wessberg/rollup-plugin-ts'
import nodeResolve from '@rollup/plugin-node-resolve'

function produceConfig({tsConfig, pathComponent}) {
   return {
      input: 'src/excmd.ts',
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
      plugins: [
         nodeResolve({
            preferBuiltins: true,
            modulesOnly: true,
         }),
         ts(),
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
