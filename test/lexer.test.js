import lexer from '../src/lexer.bs'
import tokens from '../src/tokens.bs'
import {LexBuffer, Token} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

let of_string = function(js_string) {
   const utf8_arr = toFakeUTF8String(js_string)
   return lexer.buffer_of_string(utf8_arr)
}

describe('Lexer', () => {
   it('lexes an EOF', () => {
      const buf = of_string(''),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('EOF')
   })

   it('lexes a single-character identifier', () => {
      const buf = of_string('a'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('IDENTIFIER')
      expect(lexer.token_body(tok)).toEqual('a')
   })

   it('lexes a simple identifier', () => {
      const buf = of_string('hello'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('IDENTIFIER')
      expect(lexer.token_body(tok)).toEqual('hello')
   })

   it('provides character-location information', () => {
      /* '01234' */
      const buf = of_string(' ( ) '),
         loc = lexer.next_loc(buf),
         tok = lexer.token(loc)

      expect(lexer.show_token(tok)).toEqual('LEFT_PAREN')
      expect(lexer.start_cnum(loc)).toBe(1)
   })

   // FIXME: Inexplicably, Sedlex's line-counting doesn't seem to be working
   test.skip('provides line-location information', () => {
      const buf = of_string(
         '\n' + // 0
         ' ( ) \n' + // 1
            '',
      ) // 2

      const loc = lexer.next_loc(buf),
         tok = lexer.token(loc)

      expect(lexer.show_token(tok)).toEqual('LEFT_PAREN')
      expect(lexer.start_lnum(loc)).toBe(1)
   })

   it('lexes a linewise comment', () => {
      const buf = of_string(`
         // This is a line-wise comment
      `),
         comment = ' This is a line-wise comment',
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('COMMENT_LINE')
      expect(lexer.token_body(tok)).toEqual(comment)
   })

   it('lexes a linewise comment after another token', () => {
      const buf = of_string(`
         ( // This is a line-wise comment
         )
      `),
         comment = ' This is a line-wise comment',
         _ = lexer.next(buf), // Discard one token
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('COMMENT_LINE')
      expect(lexer.token_body(tok)).toEqual(comment)
   })

   it('lexes other tokens after a linewise comment', () => {
      const buf = of_string(`
         ( // This is a line-wise comment
         )
      `),
         _ = lexer.next(buf), // Discard one token
         __ = lexer.next(buf), // Discard another token
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('RIGHT_PAREN')
   })

   it('does not lex normal tokens inside a linewise comment', () => {
      const buf = of_string(`
         ( // )
      `),
         _ = lexer.next(buf), // Discard one token
         __ = lexer.next(buf), // Discard another token
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).not.toEqual('RIGHT_PAREN')
   })

   it('lexes a blockwise comment', () => {
      const buf = of_string(`
         /* This is a block-wise comment */
      `),
         comment = ' This is a block-wise comment ',
         tok1 = lexer.next(buf),
         tok2 = lexer.next(buf),
         tok3 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toBe('LEFT_COMMENT_DELIM')
      expect(lexer.show_token(tok2)).toBe('COMMENT_CHUNK')
      expect(lexer.token_body(tok2)).toBe(comment)
      expect(lexer.show_token(tok3)).toBe('RIGHT_COMMENT_DELIM')
   })

   it('lexes a blockwise comment across multiple lines', () => {
      const buf = of_string(`
         /*
          * This is a block-wise comment
          */
      `),
         comment = `
          * This is a block-wise comment
          `,
         tok1 = lexer.next(buf),
         tok2 = lexer.next(buf),
         tok3 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toBe('LEFT_COMMENT_DELIM')
      expect(lexer.show_token(tok2)).toBe('COMMENT_CHUNK')
      expect(lexer.token_body(tok2)).toBe(comment)
      expect(lexer.show_token(tok3)).toBe('RIGHT_COMMENT_DELIM')
   })

   it('lexes a blockwise comment after another token', () => {
      const buf = of_string(`
         ( /* This is a block-wise comment */ )
      `),
         comment = ' This is a block-wise comment ',
         _ = lexer.next(buf), // Discard one token
         tok1 = lexer.next(buf),
         tok2 = lexer.next(buf),
         tok3 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toBe('LEFT_COMMENT_DELIM')
      expect(lexer.show_token(tok2)).toBe('COMMENT_CHUNK')
      expect(lexer.token_body(tok2)).toBe(comment)
      expect(lexer.show_token(tok3)).toBe('RIGHT_COMMENT_DELIM')
   })

   it('lexes other tokens after a blockwise comment', () => {
      const buf = of_string(`
         ( /* This is a block-wise comment */ )
      `)

      // Discard four tokens
      lexer.next(buf)
      lexer.next(buf)
      lexer.next(buf)
      lexer.next(buf)

      expect(lexer.show_token(lexer.next(buf))).toBe('RIGHT_PAREN')
   })

   it('lexes nested blockwise comments', () => {
      const buf = of_string(
            //  1 2   3   4   5    6        7            8 9
            `( /* This /* is a */ block-wise comment */ )`,
         ),
         first = ' This ',
         second = ' is a ',
         third = ' block-wise comment '

      lexer.next(buf) // Discard one token

      expect(lexer.show_token(lexer.next(buf))).toBe('LEFT_COMMENT_DELIM')

      const tok1 = lexer.next(buf)
      expect(lexer.show_token(tok1)).toBe('COMMENT_CHUNK')
      expect(lexer.token_body(tok1)).toBe(first)

      expect(lexer.show_token(lexer.next(buf))).toBe('LEFT_COMMENT_DELIM')

      const tok2 = lexer.next(buf)
      expect(lexer.show_token(tok2)).toBe('COMMENT_CHUNK')
      expect(lexer.token_body(tok2)).toBe(second)

      expect(lexer.show_token(lexer.next(buf))).toBe('RIGHT_COMMENT_DELIM')

      const tok3 = lexer.next(buf)
      expect(lexer.show_token(tok3)).toBe('COMMENT_CHUNK')
      expect(lexer.token_body(tok3)).toBe(third)

      expect(lexer.show_token(lexer.next(buf))).toBe('RIGHT_COMMENT_DELIM')
   })

   it('lexes medial separators', () => {
      const buf = of_string('hello-world'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toEqual('IDENTIFIER')
      expect(lexer.token_body(tok)).toEqual('hello-world')
   })

   it('will not include a medial separator at the end of an identifier', () => {
      const buf = of_string('hello-'),
         tok1 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toEqual('IDENTIFIER')
      expect(lexer.token_body(tok1)).toEqual('hello')

      expect(() => {
         lexer.next(buf)
      }).toThrowError("unexpected character in expression: 'U+002D'")
   })

   it('lexes a pipe', () => {
      const buf = of_string('foo | bar'),
         tok1 = lexer.next(buf),
         tok2 = lexer.next(buf),
         tok3 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toBe('IDENTIFIER')
      expect(lexer.show_token(tok2)).toBe('PIPE')
      expect(lexer.show_token(tok3)).toBe('IDENTIFIER')
   })

   it('lexes colons', () => {
      const buf = of_string(':::'),
         tok1 = lexer.next(buf),
         tok2 = lexer.next(buf),
         tok3 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toBe('COLON')
      expect(lexer.show_token(tok2)).toBe('COLON')
      expect(lexer.show_token(tok3)).toBe('COLON')
   })

   it('lexes semicolons', () => {
      const buf = of_string(';'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toBe('SEMICOLON')
   })

   it('lexes a count', () => {
      const buf = of_string('12345'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toBe('COUNT')
      expect(lexer.token_body(tok)).toEqual('12345')
   })

   it('lexes a long flag', () => {
      const buf = of_string('--hello'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toBe('LONG_FLAG')
      expect(lexer.token_body(tok)).toEqual('hello')
   })

   it('lexes a ‘long’ flag of a single character', () => {
      const buf = of_string('--h'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toBe('LONG_FLAG')
      expect(lexer.token_body(tok)).toEqual('h')
   })

   it('lexes a single short flag', () => {
      const buf = of_string('-h'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toBe('SHORT_FLAGS')
      expect(lexer.token_body(tok)).toEqual('h')
   })

   it('lexes multiple concatenated short flags', () => {
      const buf = of_string('-hElLo'),
         tok = lexer.next(buf)

      expect(lexer.show_token(tok)).toBe('SHORT_FLAGS')
      expect(lexer.token_body(tok)).toEqual('hElLo')
   })

   it('lexes a long flag with an explicit payload', () => {
      const buf = of_string('--hello=world'),
         tok1 = lexer.next(buf),
         tok2 = lexer.next(buf),
         tok3 = lexer.next(buf)

      expect(lexer.show_token(tok1)).toBe('LONG_FLAG')
      expect(lexer.token_body(tok1)).toEqual('hello')
      expect(lexer.show_token(tok2)).toBe('EQUALS')
      expect(lexer.show_token(tok3)).toBe('IDENTIFIER')
      expect(lexer.token_body(tok3)).toEqual('world')
   })

   it('disallows an explicit payload with spacing (before)', () => {
      const buf = of_string('--hello =world')

      lexer.next(buf) // Discard a token

      expect(()=> lexer.next(buf)).toThrowError('Unexpected whitespace')
   })

   // FIXME: This error-message isn't consistent with the previous one. Clean that up.
   it('disallows an explicit payload with spacing (after)', () => {
      const buf = of_string('--hello= world')

      // Discard two tokens
      lexer.next(buf)
      lexer.next(buf)

      expect(()=> lexer.next(buf)).toThrowError()
   })
})

describe('Lexer (objective interface)', () => {
   it('lexes an EOF', () => {
      const buf = LexBuffer.ofString(''),
         tok = buf.next()

      expect(lexer.show_token(tok._raw)).toEqual('EOF')
   })

   it('provides a symbolic token ID', () => {
      const buf = LexBuffer.ofString(''),
         tok = buf.next()

      expect(tok.id).toBe(Symbol.for('EOF'))
   })

   it('exposes the body of a simple identifier', () => {
      const buf = LexBuffer.ofString('hello'),
         tok = buf.next()

      expect(tok.id).toBe(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('hello')
   })

   it('round-trips a non-ASCII identifier', () => {
      const buf = LexBuffer.ofString('foo·bar'),
         tok = buf.next()

      expect(tok.id).toBe(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('foo·bar')
   })

   it('generates an Array of identifiers upon request', () => {
      const buf = LexBuffer.ofString('foo | bar'),
         tokens = buf.rest()

      expect(tokens).toBeInstanceOf(Array)
      expect(tokens.length).toBe(3)
      expect(tokens[0].id).toBe(Symbol.for('IDENTIFIER'))
      expect(tokens[1].id).toBe(Symbol.for('PIPE'))
      expect(tokens[2].id).toBe(Symbol.for('IDENTIFIER'))
   })

   it('round-trips multiple non-ASCII identifiers', () => {
      const buf = LexBuffer.ofString('foo·bar | baz·widget'),
         tokens = buf.rest()

      expect(tokens.length).toBe(3)
      expect(tokens[0].id).toBe(Symbol.for('IDENTIFIER'))
      expect(tokens[0].body).toEqual('foo·bar')
      expect(tokens[1].id).toBe(Symbol.for('PIPE'))
      expect(tokens[2].id).toBe(Symbol.for('IDENTIFIER'))
      expect(tokens[2].body).toEqual('baz·widget')
   })
})
