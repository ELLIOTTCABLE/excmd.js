#!/usr/bin/env node
'use strict'

const path = require('path'),
   fs = require('fs')

const [, , inFile, outFile] = process.argv

if (null == inFile || null == outFile) {
   console.error('~~ Usage: annotateMenhirTypes.js INFILENAME OUTFILENAME\n')
   throw new Error('Missing filename arguments.')
}

// There's probably a faster way to do all of this. I don't know what it is.
const linesToAnnotate = [
   [
      /type token =/,
      '[@@bs.deriving jsConverter] [@@deriving show, to_yojson { optional = true }]',
   ],
]

const from = path.resolve(inFile),
   to = path.resolve(outFile),
   file = fs.readFileSync(from),
   contents = file.toString(),
   result = linesToAnnotate.reduce(
      (acc, [lineMatchingRegex, annotation]) =>
         prependAfterFirstOccurence({
            input: acc,
            matchAfter: lineMatchingRegex,
            prependBeforeFollowing: /^\s*$/m,
            addition: annotation + '\n',
         }),
      contents,
   )

fs.writeFileSync(to, result)

// Given a string `input`, a regex `matchAfter`, a second regex `prependBeforeFollowing`, and a new
// string `addition`, this function will find the first match of `prependBeforeFollowing` that
// occurs *after* an occurence of `matchAfter`, and prepend the contents of `addition` thereto.
//
// Returns a new string.
function prependAfterFirstOccurence({
   input,
   matchAfter,
   prependBeforeFollowing,
   addition,
}) {
   const pbf = new RegExp(
      prependBeforeFollowing.source,
      prependBeforeFollowing.flags + 'g',
   )
   const startIndex = input.search(matchAfter)

   if (-1 === startIndex) {
      // console.error(`WARN: matchAfter does not occur in input: /${matchAfter.source}/`)
      return input
   }

   // console.error(`INFO: /${matchAfter.source}/ found at ${startIndex}`)

   let found = false
   return input.replace(pbf, (oldVal, ...rest) => {
      const offset = rest[rest.length - 2]

      if (found || offset <= startIndex) {
         // console.error(`INFO: skipping /${prependBeforeFollowing.source}/ at ${offset}`)
         return oldVal
      } else {
         // console.error(`INFO: found /${prependBeforeFollowing.source}/ at ${offset}`)
         found = true
         return addition + oldVal
      }
   })
}
