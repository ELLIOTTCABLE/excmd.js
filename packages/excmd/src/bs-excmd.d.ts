/**
 * A hack to ape nominal typing.
 * @hidden
 */
type Nominal<Ty, Discriminant> = Ty & {__discriminant: Discriminant}

interface $SemanticMap {
   script: $ASTt
   expression: $Expressiont
}

/** @hidden */
type $SemanticDiscriminator = keyof $SemanticMap

// Some TypeScript-side types for BuckleScript runtime values
/** @hidden */
type $exn = Nominal<Array<any>, 'exn'>
/** @hidden */
type $string = import('ocaml-string-convert').string_as_utf_8_buffer
/** @hidden */
type $list<T> = Nominal<Array<T>, 'list'>

/** @hidden */
type $buffer = Nominal<object, 'Lexer.buffer'>
/** @hidden */
type $token = Nominal<object, 'Tokens.token'>
/** @hidden */
type $token_located = Nominal<object, 'Tokens.token located'>
/** @hidden */
type $position = Nominal<object, 'Lexing.position'>

/** @hidden */
type $ASTt = Nominal<object, 'AST.t'>
/** @hidden */
type $or_subexpr = Nominal<object, 'AST.or_subexpr'>
/** @hidden */
type $word = Nominal<$list<$or_subexpr>, 'AST.word'>
/** @hidden */
type $Expressiont = Nominal<object, 'Expression.t'>
/** @hidden */
type $flag_payload = Nominal<object, 'Expression.flag_payload'>

/** @hidden */
type $checkpoint<D extends $SemanticDiscriminator> = Nominal<D, 'Incremental.checkpoint'>
/** @hidden */
type $element = Nominal<object, 'MenhirInterpreter.element'>

declare module 'bs-excmd/src/reexports.bs' {
   module List {}
   module $$Array {
      function of_list<T>($xs: $list<T>): Array<T>
   }
}

declare module 'bs-excmd/src/aST.bs' {
   function copy_expression($expr: $Expressiont): $Expressiont
   // FIXME: this is a lieeeee
   function get_literal_exn($sub: $or_subexpr): $string
   function get_sub_exn($sub: $or_subexpr): $Expressiont
   function is_literal($sub: $or_subexpr): boolean
}

declare module 'bs-excmd/src/lexer.bs' {
   function buffer_of_string($str: $string): $buffer
   function compare_token($first: $token, $second: $token): boolean
   function end_cnum($tok: $token_located): number
   function end_lnum($tok: $token_located): number
   function next_loc($buf: $buffer): $token_located
   function position_bol($pos: $position): number
   function position_cnum($pos: $position): number
   function position_fname($pos: $position): $string
   function position_lnum($pos: $position): number
   function show_token($tok: $token): $string
   function start_cnum($tok: $token_located): number
   function start_lnum($tok: $token_located): number
   function token($tok: $token_located): $token
   function token_body($tok: $token): $string | undefined
   function tokens_loc($buf: $buffer): $token_located[]
}

declare module 'bs-excmd/src/parser.bs.js' {
   function expression(exn: boolean | undefined, buf: $buffer): $Expressiont | undefined
   function script(exn: boolean | undefined, buf: $buffer): $ASTt | undefined
}

declare module 'bs-excmd/src/expression.bs' {
   function command($expr: $Expressiont): $word
   function count($expr: $Expressiont): number
   function flag($flag: $string, $expr: $Expressiont): $flag_payload | undefined
   function flags_arr($expr: $Expressiont): $string[]
   function from_script($scpt: $ASTt): $Expressiont[]
   function iteri(
      $mapper: (idx: number, $flag: $string, $fp: $flag_payload) => void,
      $expr: $Expressiont,
   ): void
   function mem($flag: $string, $expr: $Expressiont): boolean
   function payload_to_opt($fp: $flag_payload): $word | undefined
   function positionals_arr($expr: $Expressiont): $word[]
}

declare module 'bs-excmd/src/incremental.bs' {
   function $$continue<D extends $SemanticDiscriminator, Result>(
      $accept: ($val: $SemanticMap[D]) => Result,
      $fail: ($lastGood: $checkpoint<D>, $errorAt: $checkpoint<D>) => Result,
      $cp: $checkpoint<D>,
   ): Result
   function acceptable_token($cp: $checkpoint<any>): $token
   function acceptable_tokens($cp: $checkpoint<any>): $token[]
   function automaton_status_str($cp: $checkpoint<any>): $string
   function current_command($cp: $checkpoint<any>): $word | undefined
   function element_incoming_symbol_category_str($cp: $checkpoint<any>): $string
   function element_incoming_symbol_str($cp: $checkpoint<any>): $string
   function element_incoming_symbol_type_str($cp: $checkpoint<any>): $string
   function expression($buf: $buffer): $checkpoint<'expression'>
   function get_after($cp: $checkpoint<any>, idx: number): $element | undefined
   function get_before($cp: $checkpoint<any>, idx: number): $element | undefined
   function incoming_symbol_category_str($cp: $checkpoint<any>): $string | undefined
   function incoming_symbol_str($cp: $checkpoint<any>): $string | undefined
   function incoming_symbol_type_str($cp: $checkpoint<any>): $string | undefined
   function script($buf: $buffer): $checkpoint<'script'>
}
