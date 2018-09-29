import assert from 'assert';


// FIXME: Can Babel do this for us?
let textEncoder = undefined

if (typeof TextEncoder !== 'undefined') {
   textEncoder = TextEncoder

} else {
   // This is a horrible hack, but I don't know a better way to avoid polluting the global
   // namespace.
   const ctx = (1,eval)('this')
   const existingTextDecoder = ctx.TextDecoder

   // FIXME: This cannot be used in a `.mjs` file, supposedly. I need to use a dynamic import, here.
   require('fast-text-encoding')
   textEncoder = TextEncoder

   delete ctx.TextEncoder
   delete ctx.TextDecoder
   ctx.TextDecoder = existingTextDecoder
}

// FIXME: add unassert to the build
assert(typeof TextEncoder === 'undefined')
assert(typeof textEncoder !== 'undefined')


export function charCodeAt(n){
   return this[n]
}

// This is a function, returning a hacked-over Uint8Array, containing a UTF-8 string, that responds
// to the additional few String methods utilized by the BuckleScript runtime.
//
// This is an even more horrible hack than the above. Forgive me. — ELLIOTTCABLE
export default function createFakeUTF8String(js_string) {
   const byte_arr = new textEncoder("utf-8").encode(js_string)

   byte_arr.charCodeAt = charCodeAt

   return byte_arr
}
