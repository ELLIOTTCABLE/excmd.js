import ts from '@wessberg/rollup-plugin-ts'
import resolve from '@rollup/plugin-node-resolve'

export default {
   input: 'src/interface.ts',
   plugins: [
      resolve(),
      ts({
         transpiler: 'babel',
      }),
   ],
   output: [
      {
         file: 'dist/interface.js',
         format: 'cjs',
         exports: 'default',
      },
      {
         file: 'dist/interface.esm.js',
         format: 'esm',
      },
   ],
}
