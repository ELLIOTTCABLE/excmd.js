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

function script(lexbuf) {
   console.assert(lexbuf instanceof LexBuffer)
   const $scpt = $Parser.script(lexbuf.$buf)
   return new Script(INTERNAL, $scpt)
}

function scriptOfString(str) {
   const lexbuf = LexBuffer.ofString(str)
   return script(lexbuf)
}

function statement(lexbuf) {
   console.assert(lexbuf instanceof LexBuffer)
   const $stmt = $Parser.statement(lexbuf.$buf)
   return new Statement(INTERNAL, $stmt)
}

function statementOfString(str) {
   const lexbuf = LexBuffer.ofString(str)
   return statement(lexbuf)
}

export const Parser = {
   script,
   scriptOfString,
   statement,
   statementOfString,
}

// Wrapper for `AST.t`.
export class Script {
   constructor(isInternal, $scpt) {
      if (isInternal !== INTERNAL)
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
   constructor(isInternal, $stmt) {
      if (isInternal !== INTERNAL)
         throw new Error('`Statement` can only be constructed by `Excmd.parse()` and friends.')

      this.$stmt = $stmt
   }

   get count() {
      return $Statement.count(this.$stmt)
   }

   get command() {
      return $Statement.command(this.$stmt)
   }

   hasFlag(flag) {
      console.assert(typeof flag === 'string')
      return $Statement.mem(flag, this.$stmt)
   }
}

export class LexBuffer {
   constructor(isInternal, $buf) {
      if (isInternal !== INTERNAL)
         throw new Error('`Buffer` must be constructed with `LexBuffer.ofString()` et al.')

      this.$buf = $buf
   }

   static ofString(string) {
      console.assert(typeof string === 'string')
      const utf8 = toFakeUTF8String(string),
         $buf = $Lexer.buffer_of_string(utf8)
      return new LexBuffer(INTERNAL, $buf)
   }

   next() {
      const $locTok = $Lexer.next_loc(this.$buf)
      return new Token(INTERNAL, $locTok)
   }

   rest() {
      return $Lexer.tokens_loc(this.$buf).map($locTok => new Token(INTERNAL, $locTok))
   }
}

export class Token {
   constructor(isInternal, $locTok) {
      if (isInternal !== INTERNAL) throw new Error('`Token` cannot be constructed')

      this.$locTok = $locTok
   }

   get $raw() {
      return $Lexer.token(this.$locTok)
   }

   get id() {
      return Symbol.for($Lexer.show_token(this.$raw))
   }

   get startLine() {
      return $Lexer.start_lnum(this.$locTok)
   }
   get startIdx() {
      return $Lexer.start_cnum(this.$locTok)
   }
   get endLine() {
      return $Lexer.end_lnum(this.$locTok)
   }
   get endIdx() {
      return $Lexer.end_cnum(this.$locTok)
   }

   get body() {
      return fixBrokenBuckleScriptUTF8String($Lexer.token_body(this.$raw))
   }

   compare(other) {
      console.assert(other instanceof Token)
      return $Lexer.compare_token(this.$raw, other.$raw)
   }
}
