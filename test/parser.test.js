import $AST from '../src/aST.bs'
import $Lexer from '../src/lexer.bs'
import $Tokens from '../src/tokens.bs'
import $Parser from '../src/parser.bs'
import $Expression from '../src/expression.bs'
import {LexBuffer, Token, Parser, ParseError} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from 'ocaml-string-convert'

let of_string = function(js_string) {
   const utf8_arr = toFakeUTF8String(js_string)
   return $Lexer.buffer_of_string(utf8_arr)
}

// Note that the majority of the parsing-tests (semantics and acceptance) are written in OCaml to
// enable typechecking (and avoid tightly-coupling the parser's behaviour to the JavaScript
// interface.) See `test/parser_test.ml`. These are intentionally very superficial, to ensure that
// behaviour is correctly reaching the JavaScript side.
describe('Parser', () => {
   it("doesn't throw on a simple parse", () => {
      const $buf = of_string('hello')

      expect(() => $Parser.expression(true, $buf)).not.toThrow()
   })

   it('parses a single command', () => {
      const $buf = of_string('hello'),
         $expr = $Parser.expression(true, $buf),
         $command = $Expression.command($expr)

      expect($AST.is_literal($command)).toBe(true)
      expect($AST.get_literal_exn($command)).toBe('hello')
   })

   it('throws natual JavaScript ParseErrors, not BuckleScript exn reps', () => {
      const $buf = of_string('hello-')

      expect(() => $Parser.expression(true, $buf)).toThrow(ParseError)
   })
})
