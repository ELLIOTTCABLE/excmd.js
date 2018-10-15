import { toFakeUTF8String, fromFakeUTF8String } from '../src/fake_string'
import $ from './lexer.bs'

// Used to ensure that nothing else can invoke these classes' constructors directly
const INTERNAL = Symbol()

const RIGHT_PAREN         = Symbol.for("RIGHT_PAREN")
    , RIGHT_COMMENT_DELIM = Symbol.for("RIGHT_COMMENT_DELIM")
    , LEFT_PAREN          = Symbol.for("LEFT_PAREN")
    , LEFT_COMMENT_DELIM  = Symbol.for("LEFT_COMMENT_DELIM")
    , IDENTIFIER          = Symbol.for("IDENTIFIER")
    , EOF                 = Symbol.for("EOF")
    , COMMENT_LINE        = Symbol.for("COMMENT_LINE")
    , COMMENT_CHUNK       = Symbol.for("COMMENT_CHUNK")


export class LexBuffer {
   constructor(is_internal, buf){
      if (is_internal !== INTERNAL)
         throw new Error("`Buffer` must be constructed with `.of_string` et al.")

      this.buf = buf
   }

   static of_string(string){
      const utf8 = toFakeUTF8String(string)
          , buf = $.buffer_of_string(utf8)
      return new LexBuffer(INTERNAL, buf)
   }

   next(){
      const tok = $.next_loc(this.buf)
      return new Token(INTERNAL, tok)
   }
}


export class Token {
   constructor(is_internal, tok){
      if (is_internal !== INTERNAL)
         throw new Error("`Token` cannot be constructed")

      this.tok = tok
   }

   get _raw(){          return $.token(this.tok) }

   get id(){ return Symbol.for($.show_token(this._raw)) }

   get start_line(){    return $.start_lnum(this.tok) }
   get start_idx(){     return $.start_cnum(this.tok) }
   get end_line(){      return $.end_lnum(this.tok) }
   get end_idx(){       return $.end_cnum(this.tok) }

   get body(){ return          $.token_body(this._raw) }

   compare(other){  return $.compare(this.tok, other.tok) }
}
