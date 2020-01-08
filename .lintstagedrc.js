module.exports = {
   // Prettier
   // FIXME: This shouldn't be formatting package.json, ugh
   './*.{js,json,md}': ['prettier --ignore-path .gitignore --write'],
   'packages/bs-excmd/**/*.{js,json,md}': [
      'prettier --ignore-path packages/bs-excmd/.gitignore --write',
   ],
   'packages/excmd/**/*.{js,json,css,md}': [
      'prettier --ignore-path packages/excmd/.gitignore --write',
   ],

   // Jest
   '**/*.{ml,mli,mly,ts,js,json}': './scripts/invokeJestWithBucklescriptPaths.js',

   // Dune, ocamlformat, and odoc
   'packages/bs-excmd/**/*.{ml,mli,mld}': [
      'cd packages/bs-excmd/',
      'npm run format:ml ; :',
      'npm run test:ml',
      'npm run build:doc',
   ],

   // Typedoc
   'packages/excmd/**/*.{js,json,md}': ['cd packages/bs-excmd/', 'npm run build:doc'],
}