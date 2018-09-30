import assert from 'assert';


// FIXME: Can Babel do this for us?
let textEncoder = undefined
  , textDecoder = undefined

if (typeof TextEncoder !== 'undefined'
 || typeof TextDecoder !== 'undefined') {
   textEncoder = TextEncoder
   textDecoder = TextDecoder

} else {
   // This is a horrible hack, but I don't know a better way to avoid polluting the global
   // namespace.
   const ctx = (1,eval)('this')

   // FIXME: This cannot be used in a `.mjs` file, supposedly. I need to use a dynamic import, here.
   require('fast-text-encoding')
   textEncoder = TextEncoder
   textDecoder = TextDecoder

   delete ctx.TextEncoder
   delete ctx.TextDecoder
}

// FIXME: add unassert to the build
assert(typeof TextEncoder === 'undefined')
assert(typeof textEncoder !== 'undefined')
assert(typeof TextDecoder === 'undefined')
assert(typeof textDecoder !== 'undefined')


export function charCodeAt(n){
   return this[n]
}

// This is a function, returning a hacked-over Uint8Array, containing a UTF-8 string, that responds
// to the additional few String methods utilized by the BuckleScript runtime.
//
// This is an even more horrible hack than the above. Forgive me. — ELLIOTTCABLE
export function toFakeUTF8String(js_string) {
   const byte_arr = new textEncoder("utf-8").encode(js_string)

   byte_arr.charCodeAt = charCodeAt

   return byte_arr
}

export function fromFakeUTF8String(fake_string) {
   return new textDecoder("utf-8").decode(fake_string)
}
