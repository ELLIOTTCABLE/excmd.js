import {toFakeUTF8String, fixBrokenBuckleScriptUTF8String} from '../src/fake_string'

import $Lexer from './lexer.bs'
import $Parser from './parser.bs'
import $Statement from './statement.bs'

// A hack to ape nominal typing.
type Nominal<Ty, Discriminant> = Ty & {__brand: Discriminant}

// Used to ensure that nothing else can invoke these classes' constructors directly; this mints a new, locally-scoped Symbol that cannot be reproduced outside of this file.
type sentinel = Nominal<symbol, 'INTERNAL'>
const INTERNAL = Symbol() as sentinel

// Some TypeScript-side types for BuckleScript runtime values
type $string = Nominal<string, 'BuckleScript string'>

type $ASTt = Nominal<object, 'AST.t'>
type $Statementt = Nominal<object, 'Statement.t'>
type $flag_payload = Nominal<object, 'Statement.flag_payload'>

type $buffer = Nominal<object, 'Lexer.buffer'>
type $token = Nominal<object, 'Tokens.token'>
type $token_located = Nominal<object, 'Tokens.token located'>

// Ugly, inline type-annotations for my BuckleScript types. Because genType is runtime-heavy trash.
//---
// FIXME: The TypeScript compiler handles these just fine; but Babel chokes on them, for some
// reason. Pending <https://github.com/babel/babel/issues/10353>.

//declare function toFakeUTF8String(str: string): $string
//declare function fixBrokenBuckleScriptUTF8String($str: $string): string

//declare class $Lexer {
//   static buffer_of_string($str: $string): $buffer
//   static next_loc($buf: $buffer): $token_located
//   static tokens_loc($buf: $buffer): $token_located[]
//   static token($tok: $token_located): $token
//   static show_token($tok: $token): $string
//   static start_lnum($tok: $token_located): number
//   static start_cnum($tok: $token_located): number
//   static end_lnum($tok: $token_located): number
//   static end_cnum($tok: $token_located): number
//   static token_body($tok: $token): $string | undefined
//   static compare_token($first: $token, $second: $token): boolean
//}

//declare class $Parser {
//   static script(exn: boolean | undefined, buf: $buffer): $ASTt | undefined
//   static statement(exn: boolean | undefined, buf: $buffer): $Statementt | undefined
//}

//declare class $Statement {
//   static from_script($scpt: $ASTt): $Statementt[]
//   static count($stmt: $Statementt): number
//   static command($stmt: $Statementt): $string
//   static mem($flag: $string, $stmt: $Statementt): boolean
//   static positionals($stmt: $Statementt): $string[]
//   static flag($flag: $string, $stmt: $Statementt): $flag_payload | undefined
//   static payload_to_opt($fp: $flag_payload): $string | undefined
//}

type ParseOptions = {
   throwException?: boolean
}

function script(lexbuf: LexBuffer, options: ParseOptions = {}) {
   console.assert(lexbuf instanceof LexBuffer)
   const $scpt = $Parser.script(options.throwException, lexbuf.$buf)
   if (typeof $scpt === 'undefined') {
      return undefined
   } else {
      return new Script(INTERNAL, $scpt)
   }
}

function scriptOfString(str: string, options: ParseOptions = {}) {
   const lexbuf = LexBuffer.ofString(str)
   return script(lexbuf, options)
}

function statement(lexbuf: LexBuffer, options: ParseOptions = {}) {
   console.assert(lexbuf instanceof LexBuffer)
   const $stmt = $Parser.statement(options.throwException, lexbuf.$buf)
   if (typeof $stmt === 'undefined') {
      return undefined
   } else {
      return new Statement(INTERNAL, $stmt)
   }
}

function statementOfString(str: string, options: ParseOptions = {}) {
   const lexbuf = LexBuffer.ofString(str)
   return statement(lexbuf, options)
}

export const Parser = {
   script,
   scriptOfString,
   statement,
   statementOfString,
}

// Wrapper for `AST.t`.
export class Script {
   $scpt: $ASTt
   $statements: $Statementt[]

   constructor(isInternal: sentinel, $scpt: $ASTt) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Script` can only be constructed by `Excmd.parse()` and friends.',
         )

      this.$scpt = $scpt
      this.$statements = $Statement.from_script(this.$scpt)
   }

   get statements() {
      return this.$statements.map($stmt => new Statement(INTERNAL, $stmt))
   }
}

// Wrapper for `Statement.t`.
export class Statement {
   $stmt: $Statementt

   constructor(isInternal: sentinel, $stmt: $Statementt) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Statement` can only be constructed by `Excmd.parse()` and friends.',
         )

      this.$stmt = $stmt
   }

   get count(): number {
      return $Statement.count(this.$stmt)
   }

   get command(): string {
      let $command = $Statement.command(this.$stmt)
      return fixBrokenBuckleScriptUTF8String($command)
   }

   // Wrapper for `Statement.mem`
   hasFlag(flag: string): boolean {
      console.assert(typeof flag === 'string')
      let $flag = toFakeUTF8String(flag)
      return $Statement.mem($flag, this.$stmt)
   }

   // The rest are intentionally not native JavaScript ‘getters’, as they may cause mutation.

   // Wrapper for `Statement.positionals`
   getPositionals(): string[] {
      return $Statement.positionals(this.$stmt).map(fixBrokenBuckleScriptUTF8String)
   }

   // Wrapper for `Statement.flag`
   //---
   // FIXME: This is hella slower than it needs to be; it iterates over all the flags a bunch of
   //        times. I know how to fix it, I'm just lazy. Let me know if this impacts you somehow?
   getFlag(flag: string) {
      console.assert(typeof flag === 'string')
      let $flag = toFakeUTF8String(flag)
      const $flagPayloadOption = $Statement.flag($flag, this.$stmt)

      if (typeof $flagPayloadOption === 'undefined') {
         // `None`
         return undefined
      } else {
         const $flagPayload = $Statement.payload_to_opt($flagPayloadOption)

         if (typeof $flagPayload === 'undefined') {
            // `Some Empty`
            return undefined
         } else {
            // `Some (Payload str)`
            return $flagPayload
         }
      }
   }
}

export class LexBuffer {
   $buf: $buffer

   constructor(isInternal: sentinel, $buf: $buffer) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Buffer` must be constructed with `LexBuffer.ofString()` et al.',
         )

      this.$buf = $buf
   }

   static ofString(str: string) {
      console.assert(typeof str === 'string')
      const $utf8 = toFakeUTF8String(str),
         $buf = $Lexer.buffer_of_string($utf8)
      return new LexBuffer(INTERNAL, $buf)
   }

   next(): Token {
      const $tok = $Lexer.next_loc(this.$buf)
      return new Token(INTERNAL, $tok)
   }

   rest(): Token[] {
      return $Lexer.tokens_loc(this.$buf).map($tok => new Token(INTERNAL, $tok))
   }
}

export class Token {
   $tok: $token_located

   constructor(isInternal: sentinel, $tok: $token_located) {
      if (isInternal !== INTERNAL) throw new Error('`Token` cannot be constructed')

      this.$tok = $tok
   }

   get $raw(): $token {
      return $Lexer.token(this.$tok)
   }

   get id(): symbol {
      return Symbol.for($Lexer.show_token(this.$raw))
   }

   get startLine(): number {
      return $Lexer.start_lnum(this.$tok)
   }
   get startIdx(): number {
      return $Lexer.start_cnum(this.$tok)
   }
   get endLine(): number {
      return $Lexer.end_lnum(this.$tok)
   }
   get endIdx(): number {
      return $Lexer.end_cnum(this.$tok)
   }

   get body(): string | undefined {
      let $body = $Lexer.token_body(this.$raw)
      if (typeof $body === 'undefined') {
         return undefined
      } else {
         return fixBrokenBuckleScriptUTF8String($body)
      }
   }

   compare(other: Token): boolean {
      console.assert(other instanceof Token)
      return $Lexer.compare_token(this.$raw, other.$raw)
   }
}
