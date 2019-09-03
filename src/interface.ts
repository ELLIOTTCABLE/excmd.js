import {
   toFakeUTF8String,
   fromFakeUTF8String,
   string_as_utf_8_buffer,
} from 'ocaml-string-convert'

import $Lexer from './lexer.bs'
import $Parser from './parser.bs'
import $Statement from './statement.bs'
import $Incremental from './incremental.bs'

// A hack to ape nominal typing.
type Nominal<Ty, Discriminant> = Ty & {__discriminant: Discriminant}

// Used to ensure that nothing else can invoke these classes' constructors directly; this mints a new, locally-scoped Symbol that cannot be reproduced outside of this file.
type sentinel = Nominal<symbol, 'INTERNAL'>
const INTERNAL = Symbol() as sentinel

type checkpoint_state =
   | 'InputNeeded'
   | 'Shifting'
   | 'AboutToReduce'
   | 'HandlingError'
   | 'Accepted'
   | 'Rejected'

// Some TypeScript-side types for BuckleScript runtime values
type $string = string_as_utf_8_buffer

type $buffer = Nominal<object, 'Lexer.buffer'>
type $token = Nominal<object, 'Tokens.token'>
type $token_located = Nominal<object, 'Tokens.token located'>

type $ASTt = Nominal<object, 'AST.t'>
type $Statementt = Nominal<object, 'Statement.t'>
type $flag_payload = Nominal<object, 'Statement.flag_payload'>

type $checkpoint = Nominal<object, 'Incremental.checkpoint'>
type $element = Nominal<object, 'MenhirInterpreter.element'>

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

// Helpers

function fromFakeUTF8StringOption($str: string_as_utf_8_buffer | undefined): string {
   if (typeof $str === 'undefined') {
      return undefined
   } else {
      return fromFakeUTF8String($str)
   }
}

// Wrapper for Parser.script
function script(lexbuf: LexBuffer, options: ParseOptions = {}) {
   console.assert(lexbuf instanceof LexBuffer)
   const $scpt = $Parser.script(options.throwException, lexbuf.$buf)
   if (typeof $scpt === 'undefined') {
      return undefined
   } else {
      return new Script(INTERNAL, $scpt)
   }
}

// Equivalent of Parser.script_of_string
function scriptOfString(str: string, options: ParseOptions = {}) {
   const lexbuf = LexBuffer.ofString(str)
   return script(lexbuf, options)
}

// Wrapper for Incremental.script
function startScript(lexbuf: LexBuffer) {
   console.assert(lexbuf instanceof LexBuffer)
   const $cp: $checkpoint = $Incremental.script(lexbuf.$buf)
   return new Checkpoint(INTERNAL, $cp, 'script')
}

// Equivalent of Incremental.script_of_string
function startScriptWithString(str: string) {
   const lexbuf = LexBuffer.ofString(str)
   return startScript(lexbuf)
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

// Wrapper for Incremental.script
function startStatement(lexbuf: LexBuffer) {
   console.assert(lexbuf instanceof LexBuffer)
   const $cp: $checkpoint = $Incremental.statement(lexbuf.$buf)
   return new Checkpoint(INTERNAL, $cp, 'statement')
}

// Equivalent of Incremental.script_of_string
function startStatementWithString(str: string) {
   const lexbuf = LexBuffer.ofString(str)
   return startStatement(lexbuf)
}

export const Parser = {
   script,
   scriptOfString,
   startScript,
   startScriptWithString,
   statement,
   statementOfString,
   startStatement,
   startStatementWithString,
}

// Wrapper for `AST.t`.
export class Script {
   $scpt: $ASTt
   $statements: $Statementt[]

   constructor(isInternal: sentinel, $scpt: $ASTt) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Script` can only be constructed by `Excmd.script()` and friends.',
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
            '`Statement` can only be constructed by `Excmd.script()` and friends.',
         )

      this.$stmt = $stmt
   }

   get count(): number {
      return $Statement.count(this.$stmt)
   }

   get command(): string {
      let $command = $Statement.command(this.$stmt)
      return fromFakeUTF8String($command)
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
      return $Statement.positionals(this.$stmt).map(fromFakeUTF8String)
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

   next(): LocatedToken {
      const $loctok = $Lexer.next_loc(this.$buf)
      return new LocatedToken(INTERNAL, $loctok)
   }

   rest(): LocatedToken[] {
      return $Lexer
         .tokens_loc(this.$buf)
         .map($loctok => new LocatedToken(INTERNAL, $loctok))
   }
}

export class LocatedToken {
   $loctok: $token_located

   constructor(isInternal: sentinel, $loctok: $token_located) {
      if (isInternal !== INTERNAL) throw new Error('`LocatedToken` cannot be constructed')

      this.$loctok = $loctok
   }

   get $token(): $token {
      return $Lexer.token(this.$loctok)
   }

   get token(): Token {
      return new Token(INTERNAL, this.$token)
   }

   get id(): symbol {
      return Symbol.for($Lexer.show_token(this.$token))
   }

   get startLine(): number {
      return $Lexer.start_lnum(this.$loctok)
   }
   get startIdx(): number {
      return $Lexer.start_cnum(this.$loctok)
   }
   get endLine(): number {
      return $Lexer.end_lnum(this.$loctok)
   }
   get endIdx(): number {
      return $Lexer.end_cnum(this.$loctok)
   }

   get body(): string | undefined {
      return new Token(INTERNAL, this.$token).body
   }
}

export class Token {
   $token: $token

   constructor(isInternal: sentinel, $tok: $token) {
      if (isInternal !== INTERNAL) throw new Error('`Token` cannot be constructed')

      this.$token = $tok
   }

   get id(): symbol {
      return Symbol.for($Lexer.show_token(this.$token))
   }

   get body(): string | undefined {
      let $body = $Lexer.token_body(this.$token)
      return fromFakeUTF8StringOption($body)
   }

   compare(other: Token): boolean {
      console.assert(other instanceof Token)
      return $Lexer.compare_token(this.$token, other.$token)
   }
}

interface SemanticMap {
   script: Script
   statement: Statement
}

type SemanticDiscriminator = keyof SemanticMap

// Wrapper for Incremental.checkpoint.
export class Checkpoint<D extends SemanticDiscriminator> {
   $cp: $checkpoint
   type: D

   constructor(isInternal: sentinel, $cp: $checkpoint, type: D) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Checkpoint` can only be constructed by `Excmd.startScript()` and friends.',
         )

      this.$cp = $cp
      this.type = type
   }

   producesScript(): this is Checkpoint<'script'> {
      return this.type === 'script'
   }

   producesStatement(): this is Checkpoint<'statement'> {
      return this.type === 'statement'
   }

   continue<T>(
      opts: {
         onAccept?: (val: SemanticMap[D]) => T
         onFail?: (lastGood: Checkpoint<D>, errorAt: Checkpoint<D>) => T
      } = {},
   ): T {
      const self = this

      let acceptMapper
      if (typeof opts.onAccept === 'undefined') acceptMapper = function() {}
      else if (this.producesScript())
         acceptMapper = function wrapScript($scpt: $ASTt) {
            const scpt = new Script(INTERNAL, $scpt),
               onAccept = opts.onAccept as (Script) => T
            return onAccept(scpt)
         }
      else
         acceptMapper = function wrapStatement($stmt: $Statementt) {
            const stmt = new Statement(INTERNAL, $stmt),
               onAccept = opts.onAccept as (Statement) => T
            return onAccept(stmt)
         }

      let failMapper
      if (typeof opts.onFail === 'undefined') failMapper = function() {}
      else
         failMapper = function($lastGood: $checkpoint, $errorAt: $checkpoint) {
            const lastGood = new Checkpoint(INTERNAL, $lastGood, self.type),
               errorAt = new Checkpoint(INTERNAL, $errorAt, self.type)

            return opts.onFail(lastGood, errorAt)
         }

      // (BuckleScript mangles `continue` due to that being a reserved word in JavaScript.)
      return $Incremental.$$continue(acceptMapper, failMapper, this.$cp)
   }

   // FIXME: This, and some of these others, have constraints on the *state* of the checkpoint
   //        before they make sense (i.e. 'this must be in the InputNeeded state' or similar.) I'd
   //        like to raise the errors on the JavaScript side, in a JavaScript-friendly way, with
   //        the option of returning an optional instead of allowing for runtime exceptions ...
   get acceptable_token(): Token {
      const $tok = $Incremental.acceptable_token(this.$cp)
      return new Token(INTERNAL, $tok)
   }

   get acceptable_tokens(): Token[] {
      const $toks = $Incremental.acceptable_tokens(this.$cp)
      return $toks.map($tok => new Token(INTERNAL, $tok))
   }

   get command(): string | undefined {
      const $command = $Incremental.current_command(this.$cp)
      return fromFakeUTF8StringOption($command)
   }

   // FIXME: More accessors

   get automaton_status(): checkpoint_state {
      return $Incremental.automaton_status_str(this.$cp)
   }

   get incoming_symbol_category(): 'Terminal' | 'Nonterminal' | undefined {
      return $Incremental.incoming_symbol_category_str(this.$cp)
   }

   get incoming_symbol_type(): string | undefined {
      return $Incremental.incoming_symbol_type_str(this.$cp)
   }

   get incoming_symbol(): string | undefined {
      return $Incremental.incoming_symbol_str(this.$cp)
   }

   get beforeStack(): AutomatonStack<D> {
      return new AutomatonStack(INTERNAL, this, false)
   }

   get afterStack(): AutomatonStack<D> {
      return new AutomatonStack(INTERNAL, this, true)
   }
}

export class AutomatonStack<D extends SemanticDiscriminator> {
   cp: Checkpoint<D>
   isAfterStack: boolean

   constructor(isInternal: sentinel, cp: Checkpoint<D>, isAfterStack: boolean) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`AutomatonStackw` can only be obtained via `Checkpoint::beforeStack()` and friends.',
         )

      this.cp = cp
      this.isAfterStack = isAfterStack
   }

   *[Symbol.iterator]() {
      const $cp = this.cp.$cp

      const $get = this.isAfterStack ? $Incremental.get_after : $Incremental.get_before

      // Translated, "while get_whichever() isn't None." Yeah, it's a mess.
      for (let $el: $element, idx = 0; ($el = $get($cp, idx)); idx++) {
         yield new AutomatonElement(INTERNAL, $el)
      }
   }
}

export class AutomatonElement {
   $el: $element

   constructor(isInternal: sentinel, $el: $element) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`AutomatonElement` can only be obtained by iterating over `Checkpoint::stackBefore()` and friends.',
         )

      this.$el = $el
   }

   get incoming_symbol_category(): 'Terminal' | 'Nonterminal' {
      return $Incremental.element_incoming_symbol_category_str(this.$el)
   }

   get incoming_symbol_type(): string {
      return $Incremental.element_incoming_symbol_type_str(this.$el)
   }

   get incoming_symbol(): string {
      return $Incremental.element_incoming_symbol_str(this.$el)
   }
}

export default {
   Parser,
   Script,
   Statement,
   LexBuffer,
   LocatedToken,
   Token,
   Checkpoint,
}
