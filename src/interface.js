import {
   toFakeUTF8String,
   fromFakeUTF8String,
   fixBrokenBuckleScriptUTF8String,
} from '../src/fake_string'
import $ from './lexer.bs'

// Used to ensure that nothing else can invoke these classes' constructors directly
const INTERNAL = Symbol()

export class LexBuffer {
   constructor(is_internal, buf) {
      if (is_internal !== INTERNAL)
         throw new Error('`Buffer` must be constructed with `.of_string` et al.')

      this.buf = buf
   }

   static of_string(string) {
      const utf8 = toFakeUTF8String(string),
         buf = $.buffer_of_string(utf8)
      return new LexBuffer(INTERNAL, buf)
   }

   next() {
      const loc_tok = $.next_loc(this.buf)
      return new Token(INTERNAL, loc_tok)
   }

   rest() {
      return $.tokens_loc(this.buf).map(loc_tok => new Token(INTERNAL, loc_tok))
   }
}

export class Token {
   constructor(is_internal, loc_tok) {
      if (is_internal !== INTERNAL) throw new Error('`Token` cannot be constructed')

      this.loc_tok = loc_tok
   }

   get _raw() {
      return $.token(this.loc_tok)
   }

   get id() {
      return Symbol.for($.show_token(this._raw))
   }

   get start_line() {
      return $.start_lnum(this.loc_tok)
   }
   get start_idx() {
      return $.start_cnum(this.loc_tok)
   }
   get end_line() {
      return $.end_lnum(this.loc_tok)
   }
   get end_idx() {
      return $.end_cnum(this.loc_tok)
   }

   get body() {
      return fixBrokenBuckleScriptUTF8String($.token_body(this._raw))
   }

   compare(other) {
      return $.compare_token(this._raw, other._raw)
   }
}
