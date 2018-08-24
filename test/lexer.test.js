const lexer = require('../src/lexer.bs')
const tokens = require('../src/tokens.bs')

let of_string = lexer.buffer_of_string

test('lexes an EOF', ()=> {
   const buf = of_string('')
   expect(lexer.next(buf)).toBe(tokens.eOF)
})

test('provides character-location information', ()=> {
                                   /* '01234' */
   const buf = of_string(' ( ) ')
       , loc = lexer.next_loc(buf)

   expect(lexer.token(loc)).toBe(tokens.lEFT_PAREN)
   expect(lexer.start_cnum(loc)).toBe(1)
})

// FIXME: Inexplicably, Sedlex's line-counting doesn't seem to be working
test.skip('provides line-location information', ()=> {
   const buf = of_string("\n"    // 0
      + " ( ) \n"                // 1
      + "")                      // 2

   const loc = lexer.next_loc(buf)

   expect(lexer.token(loc)).toBe(tokens.lEFT_PAREN)
   expect(lexer.start_lnum(loc)).toBe(1)
})

test('lexes a linewise comment', ()=> {
   const buf = of_string(`
      // This is a line-wise comment
   `)
       , comment = " This is a line-wise comment"
   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_LINE(comment))
})
