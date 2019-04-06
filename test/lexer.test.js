import $Lexer from '../src/lexer.bs'
import $Tokens from '../src/tokens.bs'
import {LexBuffer, Token} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

let of_string = function(js_string) {
   const utf8_arr = toFakeUTF8String(js_string)
   return $Lexer.buffer_of_string(utf8_arr)
}

describe('Lexer', () => {
   it('lexes an EOF', () => {
      const $buf = of_string(''),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('EOF')
   })

   it('lexes a single-character identifier', () => {
      const $buf = of_string('a'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('IDENTIFIER')
      expect($Lexer.token_body($tok)).toEqual('a')
   })

   it('lexes a simple identifier', () => {
      const $buf = of_string('hello'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('IDENTIFIER')
      expect($Lexer.token_body($tok)).toEqual('hello')
   })

   it('provides character-location information', () => {
      /* '01234' */
      const $buf = of_string(' ( ) '),
         $loc = $Lexer.next_loc($buf),
         $tok = $Lexer.token($loc)

      expect($Lexer.show_token($tok)).toEqual('PAREN_OPEN')
      expect($Lexer.start_cnum($loc)).toBe(1)
   })

   // FIXME: Inexplicably, Sedlex's line-counting doesn't seem to be working
   test.skip('provides line-location information', () => {
      const $buf = of_string(
         '\n' + // 0
         ' ( ) \n' + // 1
            '',
      ) // 2

      const $loc = $Lexer.next_loc($buf),
         $tok = $Lexer.token($loc)

      expect($Lexer.show_token($tok)).toEqual('PAREN_OPEN')
      expect($Lexer.start_lnum($loc)).toBe(1)
   })

   it('lexes a linewise comment', () => {
      const $buf = of_string(`
         // This is a line-wise comment
      `),
         comment = ' This is a line-wise comment',
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('COMMENT')
      expect($Lexer.token_body($tok)).toEqual(comment)
   })

   it('lexes a linewise comment after another token', () => {
      const $buf = of_string(`
         ( // This is a line-wise comment
         )
      `),
         comment = ' This is a line-wise comment',
         _ = $Lexer.next($buf), // Discard one token
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('COMMENT')
      expect($Lexer.token_body($tok)).toEqual(comment)
   })

   it('lexes other tokens after a linewise comment', () => {
      const $buf = of_string(`
         ( // This is a line-wise comment
         )
      `),
         _ = $Lexer.next($buf), // Discard one token
         __ = $Lexer.next($buf), // Discard another token
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('PAREN_CLOSE')
   })

   it('does not lex normal tokens inside a linewise comment', () => {
      const $buf = of_string(`
         ( // )
      `),
         _ = $Lexer.next($buf), // Discard one token
         __ = $Lexer.next($buf), // Discard another token
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).not.toEqual('PAREN_CLOSE')
   })

   it('lexes a blockwise comment', () => {
      const $buf = of_string(`
         /* This is a block-wise comment */
      `),
         comment = ' This is a block-wise comment ',
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('COMMENT_OPEN')
      expect($Lexer.show_token($tok2)).toBe('COMMENT')
      expect($Lexer.token_body($tok2)).toBe(comment)
      expect($Lexer.show_token($tok3)).toBe('COMMENT_CLOSE')
   })

   it('lexes a blockwise comment across multiple lines', () => {
      const $buf = of_string(`
         /*
          * This is a block-wise comment
          */
      `),
         comment = `
          * This is a block-wise comment
          `,
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('COMMENT_OPEN')
      expect($Lexer.show_token($tok2)).toBe('COMMENT')
      expect($Lexer.token_body($tok2)).toBe(comment)
      expect($Lexer.show_token($tok3)).toBe('COMMENT_CLOSE')
   })

   it('lexes a blockwise comment after another token', () => {
      const $buf = of_string(`
         ( /* This is a block-wise comment */ )
      `),
         comment = ' This is a block-wise comment ',
         _ = $Lexer.next($buf), // Discard one token
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('COMMENT_OPEN')
      expect($Lexer.show_token($tok2)).toBe('COMMENT')
      expect($Lexer.token_body($tok2)).toBe(comment)
      expect($Lexer.show_token($tok3)).toBe('COMMENT_CLOSE')
   })

   it('lexes other tokens after a blockwise comment', () => {
      const $buf = of_string(`
         ( /* This is a block-wise comment */ )
      `)

      // Discard four tokens
      $Lexer.next($buf)
      $Lexer.next($buf)
      $Lexer.next($buf)
      $Lexer.next($buf)

      expect($Lexer.show_token($Lexer.next($buf))).toBe('PAREN_CLOSE')
   })

   it('lexes nested blockwise comments', () => {
      const $buf = of_string(
            //1 2  3   4   5    6        7            8 9
            `( /* This /* is a */ block-wise comment */ )`,
         ),
         first = ' This ',
         second = ' is a ',
         third = ' block-wise comment '

      $Lexer.next($buf) // Discard one token

      expect($Lexer.show_token($Lexer.next($buf))).toBe('COMMENT_OPEN')

      const $tok1 = $Lexer.next($buf)
      expect($Lexer.show_token($tok1)).toBe('COMMENT')
      expect($Lexer.token_body($tok1)).toBe(first)

      expect($Lexer.show_token($Lexer.next($buf))).toBe('COMMENT_OPEN')

      const $tok2 = $Lexer.next($buf)
      expect($Lexer.show_token($tok2)).toBe('COMMENT')
      expect($Lexer.token_body($tok2)).toBe(second)

      expect($Lexer.show_token($Lexer.next($buf))).toBe('COMMENT_CLOSE')

      const $tok3 = $Lexer.next($buf)
      expect($Lexer.show_token($tok3)).toBe('COMMENT')
      expect($Lexer.token_body($tok3)).toBe(third)

      expect($Lexer.show_token($Lexer.next($buf))).toBe('COMMENT_CLOSE')
   })

   it('lexes medial separators', () => {
      const $buf = of_string('hello-world'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('IDENTIFIER')
      expect($Lexer.token_body($tok)).toEqual('hello-world')
   })

   it('will not include a medial separator at the end of an identifier', () => {
      const $buf = of_string('hello-'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toEqual('IDENTIFIER')
      expect($Lexer.token_body($tok)).toEqual('hello')

      expect(() => {
         $Lexer.next($buf)
      }).toThrowError("unexpected character in expression: 'U+002D'")
   })

   it('lexes a pipe', () => {
      const $buf = of_string('foo | bar'),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('IDENTIFIER')
      expect($Lexer.show_token($tok2)).toBe('PIPE')
      expect($Lexer.show_token($tok3)).toBe('IDENTIFIER')
   })

   it('lexes colons', () => {
      const $buf = of_string(':::'),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('COLON')
      expect($Lexer.show_token($tok2)).toBe('COLON')
      expect($Lexer.show_token($tok3)).toBe('COLON')
   })

   it('lexes semicolons', () => {
      const $buf = of_string(';'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('SEMICOLON')
   })

   it('lexes a count', () => {
      const $buf = of_string('12345'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('COUNT')
      expect($Lexer.token_body($tok)).toEqual('12345')
   })

   it('lexes a long flag', () => {
      const $buf = of_string('--hello'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('FLAG_LONG')
      expect($Lexer.token_body($tok)).toEqual('hello')
   })

   it('lexes a ‘long’ flag of a single character', () => {
      const $buf = of_string('--h'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('FLAG_LONG')
      expect($Lexer.token_body($tok)).toEqual('h')
   })

   it('lexes a single short flag', () => {
      const $buf = of_string('-h'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('FLAGS_SHORT')
      expect($Lexer.token_body($tok)).toEqual('h')
   })

   it('lexes multiple concatenated short flags', () => {
      const $buf = of_string('-hElLo'),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('FLAGS_SHORT')
      expect($Lexer.token_body($tok)).toEqual('hElLo')
   })

   it('lexes a long flag with an explicit payload', () => {
      const $buf = of_string('--hello=world'),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('FLAG_LONG')
      expect($Lexer.token_body($tok1)).toEqual('hello')
      expect($Lexer.show_token($tok2)).toBe('EQUALS')
      expect($Lexer.show_token($tok3)).toBe('IDENTIFIER')
      expect($Lexer.token_body($tok3)).toEqual('world')
   })

   it('disallows an explicit payload with spacing (before)', () => {
      const $buf = of_string('--hello =world')

      $Lexer.next($buf) // Discard a token

      expect(() => $Lexer.next($buf)).toThrowError('Unexpected whitespace')
   })

   // FIXME: This error-message isn't consistent with the previous one. Clean that up.
   it('disallows an explicit payload with spacing (after)', () => {
      const $buf = of_string('--hello= world')

      // Discard two tokens
      $Lexer.next($buf)
      $Lexer.next($buf)

      expect(() => $Lexer.next($buf)).toThrowError()
   })

   it('lexes the start of a bare URL as its own token', () => {
      const url = 'http://google.com',
         $buf = of_string(url),
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('URL_START')
      expect($Lexer.token_body($tok)).toEqual('http://')
   })

   it('lexes the end of a bare URL as another token', () => {
      const url = 'http://google.com',
         $buf = of_string(url),
         _ = $Lexer.next($buf), // Discard one URL_START
         $tok = $Lexer.next($buf)

      expect($Lexer.show_token($tok)).toBe('URL_REST')
      expect($Lexer.token_body($tok)).toEqual('google.com')
   })

   it('lexes domains with periods as bare URLs', () => {
      const url = 'github.com/ELLIOTTCABLE',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('github.com')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('/ELLIOTTCABLE')
   })

   it('lexes known protocols without double-slashes', () => {
      const url = 'magnet:?xt=urn:btih:c12fe1c0...',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('magnet:')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('?xt=urn:btih:c12fe1c0...')
   })

   it('lexes unknown protocols as bare URLs as long as they have double-slashes', () => {
      const url = 'drafts://x-callback-url/create?text=Hello%20World',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('drafts://')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('x-callback-url/create?text=Hello%20World')
   })

   it('includes *matched* delimiters within bare URLs', () => {
      const url = 'msdn.microsoft.com/en-us/library/aa752574(VS.85).aspx',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('msdn.microsoft.com')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('/en-us/library/aa752574(VS.85).aspx')
   })

   it('excludes unmatched closing-delimiters from bare URLs', () => {
      const url = 'github.com/ELLIOTTCABLE]',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('github.com')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('/ELLIOTTCABLE')
   })

   it('reports a lexing-error on unmatched opening-delimiters in bare URLs', () => {
      const url = 'github.com/[ELLIOTTCABLE',
         $buf = of_string(url),
         _ = $Lexer.next($buf) // Discard one URL_START

      expect(() => {
         $Lexer.next($buf)
      }).toThrowError('Unmatched opening `[`')
   })

   it('includes special characters in medial position in bare URLs', () => {
      const url = 'github.com/ELLIOTTCABLE/excmd.js#readme',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('github.com')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('/ELLIOTTCABLE/excmd.js#readme')
   })

   it('excludes special characters in terminal position from bare URLs', () => {
      const url = 'github.com/ELLIOTTCABLE/excmd.js#',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('github.com')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('/ELLIOTTCABLE/excmd.js')
   })

   it('includes a few special characters in terminal position in bare URLs', () => {
      const url = 'github.com/ELLIOTTCABLE/excmd.js/',
         $buf = of_string(url),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('URL_START')
      expect($Lexer.token_body($tok1)).toEqual('github.com')
      expect($Lexer.show_token($tok2)).toBe('URL_REST')
      expect($Lexer.token_body($tok2)).toEqual('/ELLIOTTCABLE/excmd.js/')
   })

   it('lexes a long flag with a bare-URL payload', () => {
      const $buf = of_string('--site=github.com/ELLIOTTCABLE'),
         $tok1 = $Lexer.next($buf),
         $tok2 = $Lexer.next($buf),
         $tok3 = $Lexer.next($buf),
         $tok4 = $Lexer.next($buf)

      expect($Lexer.show_token($tok1)).toBe('FLAG_LONG')
      expect($Lexer.token_body($tok1)).toEqual('site')
      expect($Lexer.show_token($tok2)).toBe('EQUALS')
      expect($Lexer.show_token($tok3)).toBe('URL_START')
      expect($Lexer.token_body($tok3)).toEqual('github.com')
      expect($Lexer.show_token($tok4)).toBe('URL_REST')
      expect($Lexer.token_body($tok4)).toEqual('/ELLIOTTCABLE')
   })
})

describe('Lexer (objective interface)', () => {
   it('lexes an EOF', () => {
      const buf = LexBuffer.ofString(''),
         tok = buf.next()

      expect($Lexer.show_token($Lexer.token(tok.$locTok))).toEqual('EOF')
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
