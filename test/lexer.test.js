const lexer = require('../src/lexer.bs')
const tokens = require('../src/tokens.bs')

test('lexes an EOF', ()=> {
   const buf = lexer.buffer_of_string('')
   expect(lexer.next(buf)).toBe(tokens.eOF)
})

test('provides character-location information', ()=> {
                                   /* '01234' */
   const buf = lexer.buffer_of_string(' ( ) ')
       , loc = lexer.next_loc(buf)

   expect(lexer.token(loc)).toBe(tokens.lEFT_PAREN)
   expect(lexer.start_cnum(loc)).toBe(1)
})

test.skip('provides line-location information', ()=> {
   const buf = lexer.buffer_of_string("\n"   // 0
      + " ( ) \n"                            // 1
      + "")                                  // 2

   const loc = lexer.next_loc(buf)

   expect(lexer.token(loc)).toBe(tokens.lEFT_PAREN)
   expect(lexer.start_lnum(loc)).toBe(1)
})
