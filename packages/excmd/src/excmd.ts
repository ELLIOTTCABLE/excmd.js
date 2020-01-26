import {
   toFakeUTF8String,
   fromFakeUTF8String,
   string_as_utf_8_buffer,
} from 'ocaml-string-convert'

// FIXME: Import *only* actually-used values
import * as $_AST from 'bs-excmd/src/aST.bs'
import * as $_Lexer from 'bs-excmd/src/lexer.bs'
import * as $_Parser from 'bs-excmd/src/parser.bs.js'
import * as $_Expression from 'bs-excmd/src/expression.bs'
import * as $_Incremental from 'bs-excmd/src/incremental.bs'

/** @hidden */
const $AST: typeof $_AST = mapExposedFunctionsThruErrorTrampoline($_AST)
/** @hidden */
const $Lexer: typeof $_Lexer = mapExposedFunctionsThruErrorTrampoline($_Lexer)
/** @hidden */
const $Parser: typeof $_Parser = mapExposedFunctionsThruErrorTrampoline($_Parser)
/** @hidden */
const $Expression: typeof $_Expression = mapExposedFunctionsThruErrorTrampoline(
   $_Expression,
)
/** @hidden */
const $Incremental: typeof $_Incremental = mapExposedFunctionsThruErrorTrampoline(
   $_Incremental,
)

/**
 * A hack to ape nominal typing.
 * @hidden
 */
type Nominal<Ty, Discriminant> = Ty & {__discriminant: Discriminant}

/**
 * Used to ensure that nothing else can invoke these classes' constructors directly; this mints a new, locally-scoped Symbol that cannot be reproduced outside of this file.
 * @hidden
 */
type sentinel = Nominal<symbol, 'INTERNAL'>

/** @hidden */
interface SemanticMap {
   script: Script
   expression: Expression
}

/** @hidden */
type SemanticDiscriminator = keyof SemanticMap

/** @hidden */
const INTERNAL = Symbol() as sentinel

type checkpoint_state =
   | 'InputNeeded'
   | 'Shifting'
   | 'AboutToReduce'
   | 'HandlingError'
   | 'Accepted'
   | 'Rejected'

type symbol_category = 'Terminal' | 'Nonterminal'

type ParseOptions = {
   throwException?: boolean
}

// Errors

export class OCamlError extends Error {
   /** @hidden */
   $exn: $exn

   /** @hidden */
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

   /** @hidden */
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

   /** @hidden */
   constructor($exn: $exn) {
      const [[$error_variant, _], $loctok] = $exn

      super($exn)
      this.name = 'ParseError'
      this.token = new LocatedToken(INTERNAL, $loctok)

      Object.setPrototypeOf(this, ParseError.prototype)
   }
}

/** @hidden */
const errorMap = {
   'Lexer.LexError': LexError,
   'Parser.ParseError': ParseError,
} as const

/** @hidden */
type knownExnModule = keyof typeof errorMap

// Helpers

/** @hidden */
function isOCamlExn($exn: unknown): $exn is $exn {
   return Array.isArray($exn) && Array.isArray($exn[0]) && typeof $exn[0][0] === 'string'
}

/**
 * Call a BuckleScript-generated OCaml function, catch OCaml `exn`-type exceptions, attempt to wrap
 * them in a JavaScript-side `Error`-descendant, and then throw them. Naturally, *this function*
 * will show up in the stack-trace — that is perfectly fine, as OCaml `exn`s *don't actually
 * maintain a stack*, as a performance trade-off; thus, no information is being lost here.
 *
 * @hidden
 */
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
               errorMap[error_variant as knownExnModule] || OCamlError

            throw new ErrorConstructor($exn)
         }
      } else {
         throw $exn
      }
   }
}

/**
 * Meta-programmatic nonsense to translate all errors occuring in BuckleScript-land.
 *
 * TYPEME: This is less type-safe than it should/could be. See:
 *         <https://stackoverflow.com/questions/59914385>
 *
 * @hidden
 */
function mapExposedFunctionsThruErrorTrampoline<M extends {[X: string]: unknown}>(
   $module: M,
): M {
   const replacement = {} as M

   Object.getOwnPropertyNames($module).forEach(function(arg) {
      const key = arg as keyof M
      const $val = $module[key]

      if ($val instanceof Function) {
         replacement[key] = buckleScriptErrorTrampoline.bind(null, $val)
      } else {
         replacement[key] = $val
      }
   })

   return replacement
}

/** @hidden */
function fromFakeUTF8StringOption(
   $str: string_as_utf_8_buffer | undefined,
): string | undefined {
   if (typeof $str === 'undefined') {
      return undefined
   } else {
      return fromFakeUTF8String($str)
   }
}

/**
 * Yes, this is basically a no-op; but I like to be explicit. >,>
 * @hidden
 */
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

/**
 * As opposed to [[Sub]]; represents simple, directly-embedded `string`s in the AST. These are
 * the values that are immediately available, and do not need further evaluation.
 *
 * (Functions that return this are usually also available as `eval*` versions that help you
 * interpret subexpressions recursively; see [[Expression]] for more information.)
 */
interface Literal {
   type: 'literal'
   value: string
}

/**
 * As opposed to [[Literal]]; represents an sub-[[Expression]] embedded in the AST.
 *
 * (Functions that return this are usually also available as `eval*` versions that help you
 * interpret subexpressions recursively; see [[Expression]] for more information.)
 */
interface Sub<T> {
   type: 'subexpression'
   expr: T
}

/**
 * The function-signature required of callbacks, passed to `eval*` functions and friends, that can
 * reduce an unevaluated sub-[[Expression]] into a resultant, simple `string`-ish return value.
 *
 * See [[Expression]] for more information.
 */
type evaluator = (expr: ExpressionEval) => string

// Helper to generate a JavaScript-friendly shape for an `AST.or_subexpr`
/** @hidden */
function fromOrSubexpr($x: $or_subexpr): Literal | Sub<Expression> {
   if ($AST.is_literal($x)) {
      let $val = $AST.get_literal_exn($x)
      return {type: 'literal', value: fromFakeUTF8String($val)}
   } else {
      let $expr = $AST.get_sub_exn($x)
      return {type: 'subexpression', expr: new Expression(INTERNAL, $expr)}
   }
}

/**
 * Helper to generate a JavaScript-friendly shape for an `AST.or_subexpr`, as `fromOrSubexpr`; but
 * producing `ExpressionEval`s instead of `Expression`s for subexpressions.
 * @hidden
 */
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

/** @hidden */
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
   const $cp = $Incremental.script(lexbuf.$buf)
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
   const $cp = $Incremental.expression(lexbuf.$buf)
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
   /** @hidden */
   private $scpt: $ASTt
   /** @hidden */
   private $expressions: $Expressiont[]

   /** @hidden */
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
   /** @hidden */
   protected $expr: $Expressiont

   /** @hidden */
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
      return $Expression.flags_arr(this.$expr).map(fromFakeUTF8String)
   }

   // Wrapper for `Expression.mem`
   hasFlag(flag: string): boolean {
      console.assert(typeof flag === 'string')
      let $flag = toFakeUTF8String(flag)
      return $Expression.mem($flag, this.$expr)
   }
}

/**
 * The core type of my AST, this data-structure represents a single (sub-)command in an excmd
 * script; and is the product of entry-points like [[Parser.expressionOfString]].
 *
 * ### Construction
 * This JavaScript class, like most in my interface, cannot be constructed directly (i.e. `new
 * Expression()` is going to throw an error); instead, you must invoke the parser via the functions
 * in the exported [[Parser]] module.
 *
 * ### Evaluation
 * The language accepted by this parser allows for "sub-expressions" — runs of code that may remain
 * unevaluated, to be executed at a later point.
 *
 * The most direct method of interacting with these, is manually testing whether a particular method
 * has produced a [[Literal]] or a [[Sub]]-expression, and proceeding as appropriate:
 *
 * ```typescript
 * const expr = Parser.expressionOfString('(echo test_cmd) arg'),
 *    cmd = expr.command
 *
 * switch (cmd.type) {
 *    case 'literal': console.log(cmd.value) // ... use stringish val,
 *    case 'subexpression': handleSubexpr(cmd.expr) // or evaluate.
 * }
 * ```
 *
 * However, this can be tedious, if you only wish to evaluate simple expressions. For these
 * situations, I provide a simplified "recursive evaluation" interface: by inverting control, you
 * can allow the parser to become responsible for recursively evaluating [[Sub]] and [[Literal]]
 * values into simple `string`s, as long as you can provide the parser with a simplified
 * handler-callback that will attempt to reduce a single, given sub-expression into a `string`.
 *
 * The entry-point to this auto-evaluation interface is either [[cloneWithEvaluator]], or as a
 * further convenience, the various `eval*` methods below: [[evalCommand]], [[evalPositionals]], and
 * so on.
 *
 * Each of these takes a function — matching the [[evaluator]] signature — that takes an expression,
 * and mechanistically reduces it into a simple string:
 *
 * ```typescript
 * const expr = Parser.expressionOfString('(echo test_cmd) arg')
 *
 * function handleSubexpr(expr) {
 *    if (expr.command === 'echo') {
 *       return expr.positionals.join(' ')
 *    }
 * }
 *
 * console.log("Command:", expr.evalCommand(handleSubexpr))
 * //=> prints "Command: test_cmd"
 * ```
 *
 * (Note, additionally, that within the body of the evaluator above, I've only had to compare
 * `expr.command` to a string, directly. As evaluators receive [[ExpressionEval]]s instead of plain
 * expressions, their bodies need no further shenanigans; any requested expression-properties will
 * recursively evaluate further subexpressions as-needed.)
 *
 * Finally, if you want to access multiple elements of an expression thusly, it may be easier to
 * pre-associate an evaluator with the expression using [[cloneWithEvaluator]], producing an
 * [[ExpressionEval]] directly:
 *
 * ```typescript
 * function handleSubexpr(expr) {
 *    if (expr.command === 'echo') {
 *       return expr.positionals.join(' ')
 *    }
 * }
 *
 * const expr = Parser.expressionOfString('(echo test_cmd) arg'),
 *    ee = expr.cloneWithEvaluator(handleSubexpr)
 *
 * console.log(`Command: ${ee.command}, args: ${ee.positionals.join(' ')}`)
 * //=> prints "Command: test_cmd, args: arg"
 * ```
 *
 * ### Mutation
 * Importantly, these `Expression`s are *mutable* views onto the underlying AST. They're designed to
 * ensure you don't access the data-structure in an unsafe way. In particular, a given `word` in the
 * original input-string can only be *either* a flag-payload, *or* a positional argument — not both.
 *
 * Consider the following:
 *
 * ```typescript
 * const expr = Parser.expressionOfString('hello -f world')
 * ```
 *
 * Does that command have one flag, with the payload `world`? Or an empty (boolean) flag, and a
 * single positional-argument, `world`? My answer, in this interface, is “whichever you observe
 * first”. To be more specific, any method of either [[Expression]] or [[ExpressionEval]] that
 * produces flag-payloads or positional arguments, will *mutate* the data-structure such that
 * subsequent accesses don't see an inconsistent state.
 *
 * Let's look at some examples:
 *
 * ```typescript
 * const expr1 = Parser.expressionOfString('hello -f world')
 *
 * expr1.getFlag('f').value //=> returs 'world';
 * expr1.getPositionals() //=> returns []
 * ```
 *
 * Here, [[getFlag]] mutated `expr1`; and so a subsequent [[getPositionals]] produced a consistent
 * result: there were no remaining positional arguments.
 *
 * ```typescript
 * const expr2 = Parser.expressionOfString('hello -f world')
 *
 * expr2.getPositionals() //=> returns one arg, [{ value: 'world' }]
 * expr2.getFlag('f') //=> returs undefined; because `-f` has no payload
 * ```
 *
 * Here, [[getPositionals]] mutated `expr2`; and so a subsequent [[getFlag]], *again*, produced a
 * consistent result: there was no value available to become the payload of `-f`.
 *
 * This interface is intended to be used in a form wherein the invocations of these methods acts as
 * the specification of the parser's behaviour. For example, one command might expect a flag `-d` or
 * `--dest`, and demand a payload for that flag; whereas another might use `-d` as a boolean, and
 * expect positionals. This way, the behaviour of the parser is flexible enough to handle both of
 * those situations.
 *
 * Finally, note that at least for flags, there's also non-mutative accessors: you can always check
 * whether a flag *exists* using [[hasFlag]].
 */
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
      let $positionals = $Expression.positionals_arr(this.$expr)
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
   // TODO: Rename to something clearer, like getPayload
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
   private evaluator: evaluator

   /** @hidden */
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
      let $positionals = $Expression.positionals_arr(this.$expr)
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
   /** @hidden */
   $buf: $buffer

   /** @hidden */
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
   /** @hidden */
   private $pos: $position

   /** @hidden */
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
   /** @hidden */
   private $loctok: $token_located

   /** @hidden */
   constructor(isInternal: sentinel, $loctok: $token_located) {
      if (isInternal !== INTERNAL) throw new Error('`LocatedToken` cannot be constructed')

      this.$loctok = $loctok
   }

   /** @hidden */
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
   /** @hidden */
   private $token: $token

   /** @hidden */
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

// Wrapper for Incremental.checkpoint.
export class Checkpoint<D extends SemanticDiscriminator> {
   /** @hidden */
   $cp: $checkpoint<D>

   private type: D

   /** @hidden */
   constructor(isInternal: sentinel, $cp: $checkpoint<D>, type: D) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`Checkpoint` can only be constructed by `Excmd.startScript()` and friends.',
         )

      this.$cp = $cp
      this.type = type
   }

   /** @hidden */
   producesScript(): this is Checkpoint<'script'> {
      return this.type === 'script'
   }

   /** @hidden */
   producesExpression(): this is Checkpoint<'expression'> {
      return this.type === 'expression'
   }

   continue<T>(
      opts: {
         onAccept?: (val: SemanticMap[D]) => T
         onFail?: (lastGood: Checkpoint<D>, errorAt: Checkpoint<D>) => T
      } = {},
   ): T | void {
      const self = this

      let acceptMapper: ($val: $SemanticMap[D]) => T | void
      if (typeof opts.onAccept === 'undefined') acceptMapper = function() {}
      else if (this.producesScript())
         acceptMapper = function wrapScript($scpt: $SemanticMap[D]) {
            const scpt = new Script(INTERNAL, $scpt as $ASTt),
               onAccept = opts.onAccept as (arg0: Script) => T
            return onAccept(scpt)
         }
      else
         acceptMapper = function wrapExpression($expr: $SemanticMap[D]) {
            const expr = new Expression(INTERNAL, $expr as $Expressiont),
               onAccept = opts.onAccept as (arg0: Expression) => T
            return onAccept(expr)
         }

      const onFail = opts.onFail

      let failMapper: ($lastGood: $checkpoint<D>, $errorAt: $checkpoint<D>) => T | void
      if (typeof onFail === 'undefined') failMapper = function() {}
      else
         failMapper = function($lastGood: $checkpoint<D>, $errorAt: $checkpoint<D>) {
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

   get command(): Literal | Sub<Expression> | undefined {
      const $command = $Incremental.current_command(this.$cp)
      return typeof $command === 'undefined' ? undefined : fromOrSubexpr($command)
   }

   // FIXME: More accessors

   get automaton_status(): checkpoint_state {
      const $str = $Incremental.automaton_status_str(this.$cp)
      if (typeof $str === 'undefined') {
         return undefined
      } else {
         return $str as checkpoint_state
      }
   }

   get incoming_symbol_category(): symbol_category | undefined {
      const $str = $Incremental.incoming_symbol_category_str(this.$cp)
      if (typeof $str === 'undefined') {
         return undefined
      } else {
         return $str as symbol_category
      }
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

   /** @hidden */
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
   /** @hidden */
   private $el: $element

   /** @hidden */
   constructor(isInternal: sentinel, $el: $element) {
      if (isInternal !== INTERNAL)
         throw new Error(
            '`AutomatonElement` can only be obtained by iterating over `Checkpoint::stackBefore()` and friends.',
         )

      this.$el = $el
   }

   get incoming_symbol_category(): 'Terminal' | 'Nonterminal' {
      return $Incremental.element_incoming_symbol_category_str(
         this.$el,
      ) as symbol_category
   }

   get incoming_symbol_type(): string {
      return $Incremental.element_incoming_symbol_type_str(this.$el)
   }

   get incoming_symbol(): string {
      return $Incremental.element_incoming_symbol_str(this.$el)
   }
}
