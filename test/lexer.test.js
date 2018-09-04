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

test('lexes a linewise comment after another token', ()=> {
   const buf = of_string(`
      ( // This is a line-wise comment
      )
   `)
       , comment = " This is a line-wise comment"

   lexer.next(buf) // Discard one token

   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_LINE(comment))
})

test('lexes other tokens after a linewise comment', ()=> {
   const buf = of_string(`
      ( // This is a line-wise comment
      )
   `)
       , comment = " This is a line-wise comment"

   lexer.next(buf); lexer.next(buf) // Discard two tokens

   expect(lexer.next(buf)).toBe(tokens.rIGHT_PAREN)
})

test('does not lex normal tokens inside a linewise comment', ()=> {
   const buf = of_string(`
      ( // )
   `)
       , comment = " This is a line-wise comment"

   lexer.next(buf); lexer.next(buf) // Discard two tokens

   expect(lexer.next(buf)).not.toBe(tokens.rIGHT_PAREN)
})

test('lexes a blockwise comment', ()=> {
   const buf = of_string(`
      /* This is a block-wise comment */
   `)
       , comment = " This is a block-wise comment "

   expect(lexer.next(buf)).toBe(tokens.lEFT_COMMENT_DELIM)
   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_CHUNK(comment))
   expect(lexer.next(buf)).toBe(tokens.rIGHT_COMMENT_DELIM)
})

test('lexes a blockwise comment across multiple lines', ()=> {
   const buf = of_string(`
      /*
       * This is a block-wise comment
       */
   `)
       , comment = `
       * This is a block-wise comment
       `

   expect(lexer.next(buf)).toBe(tokens.lEFT_COMMENT_DELIM)
   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_CHUNK(comment))
   expect(lexer.next(buf)).toBe(tokens.rIGHT_COMMENT_DELIM)
})

test('lexes a blockwise comment after another token', ()=> {
   const buf = of_string(`
      ( /* This is a block-wise comment */ )
   `)
       , comment = " This is a block-wise comment "

   lexer.next(buf) // Discard one token

   expect(lexer.next(buf)).toBe(tokens.lEFT_COMMENT_DELIM)
   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_CHUNK(comment))
   expect(lexer.next(buf)).toBe(tokens.rIGHT_COMMENT_DELIM)
})

test('lexes other tokens after a blockwise comment', ()=> {
   const buf = of_string(`
      ( /* This is a block-wise comment */ )
   `)

   // Discard four tokens
   lexer.next(buf); lexer.next(buf); lexer.next(buf); lexer.next(buf);

   expect(lexer.next(buf)).toBe(tokens.rIGHT_PAREN)
})

test('lexes nested blockwise comments', ()=> {
   const buf = of_string(
   //  1 2   3   4   5    6        7            8 9
      `( /* This /* is a */ block-wise comment */ )`
   )
       , first = " This "
       , second = " is a "
       , third = " block-wise comment "

   lexer.next(buf) // Discard one token

   expect(lexer.next(buf)).toBe(tokens.lEFT_COMMENT_DELIM)
   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_CHUNK(first))

   expect(lexer.next(buf)).toBe(tokens.lEFT_COMMENT_DELIM)
   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_CHUNK(second))
   expect(lexer.next(buf)).toBe(tokens.rIGHT_COMMENT_DELIM)

   expect(lexer.next(buf)).toEqual(tokens.cOMMENT_CHUNK(third))
   expect(lexer.next(buf)).toBe(tokens.rIGHT_COMMENT_DELIM)
})

test('lexes a simple identifier', ()=> {
   const buf = of_string("hello")

   expect(lexer.next(buf)).toEqual(tokens.iDENTIFIER("hello"))
})
