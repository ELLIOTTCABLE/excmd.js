module.exports = {
   // Jest
   '**/*.{ml,mli,mly,ts,js,json}': './scripts/invokeJestWithBucklescriptPaths.js',

   // Dune & ocamlformat
   'packages/bs-excmd/**/*.{ml,mli}': [
      'cd packages/bs-excmd/',
      'npm run format:ml ; :',
      'npm run test:ml',
   ],

   // Prettier
   './*.{js,json,md}': ['prettier --ignore-path .gitignore --write'],
   'packages/bs-excmd/**/*.{js,json,md}': [
      'prettier --ignore-path packages/bs-excmd/.gitignore --write',
   ],
   'packages/excmd/**/*.{js,json,css,md}': [
      'prettier --ignore-path packages/excmd/.gitignore --write',
   ],
}
