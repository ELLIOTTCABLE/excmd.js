import * as $AST from '../src/aST.bs'
import * as $Lexer from '../src/lexer.bs'
import * as $Tokens from '../src/tokens.bs'
import * as $Parser from '../src/parser.bs'
import * as $Expression from '../src/expression.bs'
import {List as $List} from '../src/reexports.bs'
// import {LexBuffer, Token, Parser, ParseError} from '../src/interface'
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
         $word = $Expression.command($expr)

      expect($List.length($word)).toBe(1)

      const $command = $List.nth($word, 0)
      expect($AST.is_literal($command)).toBe(true)
      expect($AST.get_literal_exn($command)).toBe('hello')
   })

   // FIXME: This needs to be moved into the JS-interface excmd project ... and also, needs to not
   //        stomp on the existing behaviour *anyway*. :P
   // it('throws natual JavaScript ParseErrors, not BuckleScript exn reps', () => {
   //    const $buf = of_string('hello-')
   //
   //    expect(() => $Parser.expression(true, $buf)).toThrow(ParseError)
   // })
})
