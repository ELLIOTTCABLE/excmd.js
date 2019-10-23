import {
   toFakeUTF8String,
   fromFakeUTF8String,
   string_as_utf_8_buffer,
} from 'ocaml-string-convert'

import $AST from './aST.bs'
import $Lexer from './lexer.bs'
import $Parser from './parser.bs'
import $Expression from './expression.bs'
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
type $exn = Nominal<Array<any>, 'exn'>
type $string = string_as_utf_8_buffer

type $buffer = Nominal<object, 'Lexer.buffer'>
type $token = Nominal<object, 'Tokens.token'>
type $token_located = Nominal<object, 'Tokens.token located'>
type $position = Nominal<object, 'Lexing.position'>

type $ASTt = Nominal<object, 'AST.t'>
type $or_subexpr = Nominal<object, 'AST.or_subexpr'>
type $Expressiont = Nominal<object, 'Expression.t'>
type $flag_payload = Nominal<object, 'Expression.flag_payload'>

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
//   static expression(exn: boolean | undefined, buf: $buffer): $Expressiont | undefined
//}

//declare class $Expression {
//   static from_script($scpt: $ASTt): $Expressiont[]
//   static count($expr: $Expressiont): number
//   static command($expr: $Expressiont): $string
//   static mem($flag: $string, $expr: $Expressiont): boolean
//   static positionals($expr: $Expressiont): $string[]
//   static flag($flag: $string, $expr: $Expressiont): $flag_payload | undefined
//   static payload_to_opt($fp: $flag_payload): $string | undefined
//}

type ParseOptions = {
   throwException?: boolean
}

// Errors

export class OCamlError extends Error {
   $exn: $exn

   constructor($exn: $exn, message?: string) {
      // FIXME: This is fragile; I'm depending on the BuckleScript runtime-repr of `exn`, here ...
      console.assert(
         Array.isArray($exn) && Array.isArray($exn[0]) && typeof $exn[0][0] === 'string',
      )

      const [[error_variant, _], __] = $exn

      if (typeof message === 'string' && message.length > 0) {
         super(message)
      } else if (typeof error_variant === 'string') {
         super('OCaml exception: ' + error_variant)
      } else {
         super('Unknown OCaml exception.')
      }

      this.$exn = $exn

      // Set the prototype explicitly. See:
      //    <https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work>
      Object.setPrototypeOf(this, OCamlError.prototype)
   }
}

export class LexError extends OCamlError {
   pos: Position

   constructor($exn: $exn) {
      const [[$error_variant, _], $pos, $message] = $exn,
         message = fromFakeUTF8String($message),
         pos = new Position(INTERNAL, $pos)

      let print
      if (typeof message === 'string' && message.length > 0) {
         print = `${message} (${pos.filename}:${pos.line}:${pos.character})`
      } else {
         print = `Unknown LexError (${pos.filename}:${pos.line}:${pos.character})`
      }
      super($exn, print)

      this.name = 'LexError'
      this.pos = pos

      Object.setPrototypeOf(this, LexError.prototype)
   }
}

export class ParseError extends OCamlError {
   token: LocatedToken

   constructor($exn: $exn) {
      const [[$error_variant, _], $loctok] = $exn

      super($exn)
      this.name = 'ParseError'
      this.token = new LocatedToken(INTERNAL, $loctok)

      Object.setPrototypeOf(this, ParseError.prototype)
   }
}

const errorMap = {
   'Lexer.LexError': LexError,
   'Parser.ParseError': ParseError,
}

// Helpers

function isOCamlExn($exn: unknown): $exn is $exn {
   return Array.isArray($exn) && Array.isArray($exn[0]) && typeof $exn[0][0] === 'string'
}

// Call a BuckleScript-generated OCaml function, catch OCaml `exn`-type exceptions, attempt to wrap
// them in a JavaScript-side `Error`-descendant, and then throw them. Naturally, *this function*
// will show up in the stack-trace — that is perfectly fine, as OCaml `exn`s *don't actually
// maintain a stack*, as a performance trade-off; thus, no information is being lost here.
function buckleScriptErrorTrampoline<R>(
   bs_function: (...args: unknown[]) => R,
   ...args: unknown[]
): R {
   try {
      return bs_function.apply(null, args)
   } catch ($exn) {
      if (isOCamlExn($exn)) {
         const [[error_variant]] = $exn
         if (error_variant === 'Caml_js_exceptions.Error') {
            const orig_error = $exn[1]
            throw orig_error
         } else {
            const ErrorConstructor: typeof OCamlError =
               errorMap[error_variant] || OCamlError

            throw new ErrorConstructor($exn)
         }
      } else {
         throw $exn
      }
   }
}

// Meta-programmatic nonsense to translate all errors occuring in BuckleScript-land.
function mapExposedFunctionsThruErrorTrampoline($module) {
   for (const exposed in $module) {
      if ($module.hasOwnProperty(exposed)) {
         const $func = $module[exposed]

         if ($func instanceof Function) {
            $module[exposed] = buckleScriptErrorTrampoline.bind(null, $func)
         }
      }
   }
}

;[$AST, $Lexer, $Parser, $Expression, $Incremental].forEach(
   mapExposedFunctionsThruErrorTrampoline,
)

function fromFakeUTF8StringOption(
   $str: string_as_utf_8_buffer | undefined,
): string | undefined {
   if (typeof $str === 'undefined') {
      return undefined
   } else {
      return fromFakeUTF8String($str)
   }
}

// Yes, this is basically a no-op; but I like to be explicit. >,>
function fromFlagPayloadOption(
   $payloadOpt: $flag_payload | undefined,
): $or_subexpr | undefined {
   if (typeof $payloadOpt === 'undefined') {
      // `None`
      return undefined
   } else {
      const $payload = $Expression.payload_to_opt($payloadOpt)

      if (typeof $payload === 'undefined') {
         // `Some Empty`
         return undefined
      } else {
         // `Some (Payload (string or_subexpr))`
         return $payload
      }
   }
}

interface Literal {
   type: 'literal'
   value: string
}

interface Sub<T> {
   type: 'subexpression'
   expr: T
}

// The signature of a function
type evaluator = (expr: ExpressionEval) => string

// Helper to generate a JavaScript-friendly shape for an `AST.or_subexpr`
function fromOrSubexpr($x: $or_subexpr): Literal | Sub<Expression> {
   if ($AST.is_literal($x)) {
      let $val = $AST.get_literal_exn($x)
      return {type: 'literal', value: fromFakeUTF8String($val)}
   } else {
      let $expr = $AST.get_sub_exn($x)
      return {type: 'subexpression', expr: new Expression(INTERNAL, $expr)}
   }
}

// Helper to generate a JavaScript-friendly shape for an `AST.or_subexpr`, as `fromOrSubexpr`; but
// producing `ExpressionEval`s instead of `Expression`s for subexpressions.
function fromOrSubexprWithEval(
   evl: evaluator,
   $x: $or_subexpr,
): Literal | Sub<ExpressionEval> {
   if ($AST.is_literal($x)) {
      let $val = $AST.get_literal_exn($x)
      return {type: 'literal', value: fromFakeUTF8String($val)}
   } else {
      let $expr = $AST.get_sub_exn($x)
      return {type: 'subexpression', expr: new ExpressionEval(INTERNAL, $expr, evl)}
   }
}

function reduceOrSubexprWithEval(evl: evaluator, $x: $or_subexpr): string {
   if ($AST.is_literal($x)) {
      let $val = $AST.get_literal_exn($x)
      return fromFakeUTF8String($val)
   } else {
      let $expr = $AST.get_sub_exn($x),
         expr = new ExpressionEval(INTERNAL, $expr, evl)
      return evl.call(null, expr)
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

function expression(lexbuf: LexBuffer, options: ParseOptions = {}) {
   console.assert(lexbuf instanceof LexBuffer)
   const $expr = $Parser.expression(options.throwException, lexbuf.$buf)
   if (typeof $expr === 'undefined') {
      return undefined
   } else {
      return new Expression(INTERNAL, $expr)
   }
}

function expressionOfString(str: string, options: ParseOptions = {}) {
   const lexbuf = LexBuffer.ofString(str)
   return expression(lexbuf, options)
}

// Wrapper for Incremental.script
function startExpression(lexbuf: LexBuffer) {
   console.assert(lexbuf instanceof LexBuffer)
   const $cp: $checkpoint = $Incremental.expression(lexbuf.$buf)
   return new Checkpoint(INTERNAL, $cp, 'expression')
}

// Equivalent of Incremental.script_of_string
function startExpressionWithString(str: string) {
   const lexbuf = LexBuffer.ofString(str)
   return startExpression(lexbuf)
}

export const Parser = {
   script,
   scriptOfString,
   startScript,
   startScriptWithString,
   expression,
   expressionOfString,
   startExpression,
   startExpressionWithString,
}

// Wrapper for `AST.t`.
export class Script {
   $scpt: $ASTt
   $expressions: $Expressiont[]

   constructor(isInternal: sentinel, $scpt: $ASTt) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Script` can only be constructed by `Excmd.script()` and friends.',
         )

      this.$scpt = $scpt
      this.$expressions = $Expression.from_script(this.$scpt)
   }

   get expressions() {
      return this.$expressions.map($expr => new Expression(INTERNAL, $expr))
   }
}

class ExpressionCommon {
   $expr: $Expressiont

   constructor(isInternal: sentinel, $expr: $Expressiont) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Expression` can only be constructed by `Excmd.script()` and friends.',
         )

      this.$expr = $expr
   }

   get count(): number {
      return $Expression.count(this.$expr)
   }

   get flags(): string[] {
      return $Expression.flags(this.$expr).map(fromFakeUTF8String)
   }

   // Wrapper for `Expression.mem`
   hasFlag(flag: string): boolean {
      console.assert(typeof flag === 'string')
      let $flag = toFakeUTF8String(flag)
      return $Expression.mem($flag, this.$expr)
   }
}

// Wrapper for `Expression.t`.
export class Expression extends ExpressionCommon {
   clone(): Expression {
      let $new = $AST.copy_expression(this.$expr)
      return new Expression(INTERNAL, $new)
   }

   cloneWithEvaluator(handleSubexpr: evaluator): ExpressionEval {
      let $new = $AST.copy_expression(this.$expr)
      return new ExpressionEval(INTERNAL, $new, handleSubexpr)
   }

   get command(): Literal | Sub<Expression> {
      let $command = $Expression.command(this.$expr)
      return fromOrSubexpr($command)
   }

   evalCommand(handleSubexpr: evaluator): string {
      let ee = new ExpressionEval(INTERNAL, this.$expr, handleSubexpr)
      return ee.command
   }

   // Wrapper for `Expression.positionals`
   getPositionals(): (Literal | Sub<Expression>)[] {
      let $positionals = $Expression.positionals(this.$expr)
      return $positionals.map(fromOrSubexpr)
   }

   evalPositionals(handleSubexpr: evaluator): string[] {
      let ee = new ExpressionEval(INTERNAL, this.$expr, handleSubexpr)
      return ee.getPositionals()
   }

   // Wrapper for `Expression.iter`
   forEachFlag(
      f: (
         name: string,
         payload: Literal | Sub<Expression> | undefined,
         idx: number,
      ) => void,
   ): void {
      const flagMapper = function(
         idx: number,
         $name: $string,
         $payloadOpt: $flag_payload | undefined,
      ) {
         const name = fromFakeUTF8String($name),
            $payload = fromFlagPayloadOption($payloadOpt),
            payload =
               typeof $payload === 'undefined' ? undefined : fromOrSubexpr($payload)

         f.call(null, name, payload, idx)
      }
      $Expression.iteri(flagMapper, this.$expr)
   }

   evalEachFlag(
      handleSubexpr: evaluator,
      f: (name: string, payload: string | undefined, idx: number) => void,
   ): void {
      let ee = new ExpressionEval(INTERNAL, this.$expr, handleSubexpr)
      return ee.forEachFlag(f)
   }

   // Wrapper for `Expression.flag`
   getFlag(flag: string): Literal | Sub<Expression> | undefined {
      console.assert(typeof flag === 'string')
      const $flag = toFakeUTF8String(flag),
         $payloadOpt = $Expression.flag($flag, this.$expr),
         $payload = fromFlagPayloadOption($payloadOpt)

      return typeof $payload === 'undefined' ? undefined : fromOrSubexpr($payload)
   }

   evalFlag(handleSubexpr: evaluator, flag: string): string | undefined {
      let ee = new ExpressionEval(INTERNAL, this.$expr, handleSubexpr)
      return ee.getFlag(flag)
   }
}

// `Expression.t`, with recursive evaluation of subexpressions
export class ExpressionEval extends ExpressionCommon {
   $expr: $Expressiont
   evaluator: evaluator

   constructor(isInternal: sentinel, $expr: $Expressiont, handleSubexpr: evaluator) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`ExpressionEval` can only be constructed by `Expression#evalPositionals()` and similar.',
         )

      super(isInternal, $expr)

      console.assert(typeof handleSubexpr === 'function')
      this.evaluator = handleSubexpr
   }

   clone(): ExpressionEval {
      let $new = $AST.copy_expression(this.$expr)
      return new ExpressionEval(INTERNAL, $new, this.evaluator)
   }

   get command(): string {
      let $command = $Expression.command(this.$expr)
      return reduceOrSubexprWithEval(this.evaluator, $command)
   }

   // Wrapper for `Expression.positionals`
   getPositionals(): string[] {
      let $positionals = $Expression.positionals(this.$expr)
      // My kingdom for better functional tooling in JavaScript ;_;
      return $positionals.map(reduceOrSubexprWithEval.bind(null, this.evaluator))
   }

   // Wrapper for `Expression.iter`
   forEachFlag(
      f: (name: string, payload: string | undefined, idx: number) => void,
   ): void {
      const self = this,
         flagMapper = function(
            idx: number,
            $name: $string,
            $payloadOpt: $flag_payload | undefined,
         ) {
            const name = fromFakeUTF8String($name),
               $payload = fromFlagPayloadOption($payloadOpt),
               payload =
                  typeof $payload === 'undefined'
                     ? undefined
                     : reduceOrSubexprWithEval(self.evaluator, $payload)

            f.call(null, name, payload, idx)
         }

      $Expression.iteri(flagMapper, this.$expr)
   }

   // Wrapper for `Expression.flag`
   getFlag(flag: string): string | undefined {
      console.assert(typeof flag === 'string')
      const $flag = toFakeUTF8String(flag),
         $payloadOpt = $Expression.flag($flag, this.$expr),
         $payload = fromFlagPayloadOption($payloadOpt)

      return typeof $payload === 'undefined'
         ? undefined
         : reduceOrSubexprWithEval(this.evaluator, $payload)
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

export class Position {
   $pos: $position

   constructor(isInternal: sentinel, $pos: $position) {
      if (isInternal !== INTERNAL) throw new Error('`Position` cannot be constructed')

      this.$pos = $pos
   }

   get filename(): string {
      const $fname = $Lexer.position_fname(this.$pos)
      return fromFakeUTF8String($fname)
   }

   get line(): number {
      return $Lexer.position_lnum(this.$pos)
   }

   get byte(): number {
      return $Lexer.position_cnum(this.$pos)
   }

   get character(): number {
      return $Lexer.position_bol(this.$pos)
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
   expression: Expression
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

   producesExpression(): this is Checkpoint<'expression'> {
      return this.type === 'expression'
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
               onAccept = opts.onAccept as (arg0: Script) => T
            return onAccept(scpt)
         }
      else
         acceptMapper = function wrapExpression($expr: $Expressiont) {
            const expr = new Expression(INTERNAL, $expr),
               onAccept = opts.onAccept as (arg0: Expression) => T
            return onAccept(expr)
         }

      const onFail = opts.onFail

      let failMapper
      if (typeof onFail === 'undefined') failMapper = function() {}
      else
         failMapper = function($lastGood: $checkpoint, $errorAt: $checkpoint) {
            const lastGood = new Checkpoint(INTERNAL, $lastGood, self.type),
               errorAt = new Checkpoint(INTERNAL, $errorAt, self.type)

            return onFail(lastGood, errorAt)
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
            '`AutomatonStack` can only be obtained via `Checkpoint::beforeStack()` and friends.',
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
   OCamlError,
   LexError,
   Parser,
   Script,
   Expression,
   LexBuffer,
   LocatedToken,
   Token,
   Checkpoint,
}
