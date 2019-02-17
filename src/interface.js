import {
   toFakeUTF8String,
   fromFakeUTF8String,
   fixBrokenBuckleScriptUTF8String,
} from '../src/fake_string'

import $Lexer from './lexer.bs'
import $Parser from './parser.bs'
import $Statement from './statement.bs'

// Used to ensure that nothing else can invoke these classes' constructors directly
const INTERNAL = Symbol()

export const Parser = {
   script: function(lexbuf) {
      const $scpt = $Parser.script(lexbuf.$buf)
      return new Script(INTERNAL, $scpt)
   },

   statement: function(lexbuf) {
      const $stmt = $Parser.statement(lexbuf.$buf)
      return new Statement(INTERNAL, $stmt)
   }
}

// Wrapper for `AST.t`.
export class Script {
   constructor(is_internal, $scpt) {
      if (is_internal !== INTERNAL)
         throw new Error('`Script` can only be constructed by `Excmd.parse()` and friends.')

      this.$scpt = $scpt
      this.$statements = $Statement.from_script(this.$scpt)
   }

   get statements() {
      return this.$statements.map($stmt => new Statement(INTERNAL, $stmt))
   }
}

// Wrapper for `Statement.t`.
export class Statement {
   constructor(is_internal, $stmt) {
      if (is_internal !== INTERNAL)
         throw new Error('`Statement` can only be constructed by `Excmd.parse()` and friends.')

      this.$stmt = $stmt
   }

   get command(){
      this.$stmt.command
   }

   get count(){
      this.$stmt.count
   }
}

export class LexBuffer {
   constructor(is_internal, $buf) {
      if (is_internal !== INTERNAL)
         throw new Error('`Buffer` must be constructed with `LexBuffer.of_string()` et al.')

      this.$buf = $buf
   }

   static of_string(string) {
      const utf8 = toFakeUTF8String(string),
         $buf = $Lexer.buffer_of_string(utf8)
      return new LexBuffer(INTERNAL, $buf)
   }

   next() {
      const $loc_tok = $Lexer.next_loc(this.$buf)
      return new Token(INTERNAL, $loc_tok)
   }

   rest() {
      return $Lexer.tokens_loc(this.$buf).map($loc_tok => new Token(INTERNAL, $loc_tok))
   }
}

export class Token {
   constructor(is_internal, $loc_tok) {
      if (is_internal !== INTERNAL) throw new Error('`Token` cannot be constructed')

      this.$loc_tok = $loc_tok
   }

   get $raw() {
      return $Lexer.token(this.$loc_tok)
   }

   get id() {
      return Symbol.for($Lexer.show_token(this.$raw))
   }

   get start_line() {
      return $Lexer.start_lnum(this.$loc_tok)
   }
   get start_idx() {
      return $Lexer.start_cnum(this.$loc_tok)
   }
   get end_line() {
      return $Lexer.end_lnum(this.$loc_tok)
   }
   get end_idx() {
      return $Lexer.end_cnum(this.$loc_tok)
   }

   get body() {
      return fixBrokenBuckleScriptUTF8String($Lexer.token_body(this.$raw))
   }

   compare(other) {
      return $Lexer.compare_token(this.$raw, other.$raw)
   }
}
