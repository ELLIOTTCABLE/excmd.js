import filesize from 'rollup-plugin-filesize'
import nodeResolve from '@rollup/plugin-node-resolve'
import ts from '@wessberg/rollup-plugin-ts'

function produceConfig({tsConfig, pathComponent}) {
   return {
      input: 'src/excmd.ts',
      output: [
         {
            file: `dist/excmd${pathComponent || ''}.cjs`,
            format: 'cjs',
         },
         {
            file: `dist/excmd${pathComponent || ''}.mjs`,
            format: 'esm',
         },
      ],
      plugins: [
         nodeResolve({
            preferBuiltins: true,
            modulesOnly: true,
         }),
         ts(),
         filesize(),
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
