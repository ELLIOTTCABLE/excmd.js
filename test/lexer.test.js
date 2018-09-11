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

test('lexes a non-ASCII identifier', ()=> {
   const buf = of_string("foo·bar")
       , tok = lexer.next(buf)
   expect(tok).toEqual(tokens.iDENTIFIER("foo·bar"))
})

// Yes, I used Google Translate. Don't h8.
test.skip('lexes identifiers in non-English scripts', ()=> {
   expect(lexer.next(of_string("حيوان_اليف"))).toEqual(tokens.iDENTIFIER("حيوان_اليف")) // Arabic
   expect(lexer.next(of_string("կենդանիներ"))).toEqual(tokens.iDENTIFIER("կենդանիներ")) // Armenian
   expect(lexer.next(of_string("পশু"))).toEqual(tokens.iDENTIFIER("পশু")) // Bengali
   expect(lexer.next(of_string("животное"))).toEqual(tokens.iDENTIFIER("животное")) // Cyrillic (Russian)
   expect(lexer.next(of_string("जानवर"))).toEqual(tokens.iDENTIFIER("जानवर")) // Hindi (Devanagari)
   expect(lexer.next(of_string("እንስሳ"))).toEqual(tokens.iDENTIFIER("እንስሳ")) // Amharic (Ethiopic)
   expect(lexer.next(of_string("ცხოველი"))).toEqual(tokens.iDENTIFIER("ცხოველი")) // Georgian
   expect(lexer.next(of_string("ζώο"))).toEqual(tokens.iDENTIFIER("ζώο")) // Greek
   expect(lexer.next(of_string("પ્રાણી"))).toEqual(tokens.iDENTIFIER("પ્રાણી")) // Gujarati
   expect(lexer.next(of_string("動物"))).toEqual(tokens.iDENTIFIER("動物")) // Chinese (Han)
   expect(lexer.next(of_string("동물"))).toEqual(tokens.iDENTIFIER("동물")) // Korean (Hangul)
   expect(lexer.next(of_string("בעל חיים"))).toEqual(tokens.iDENTIFIER("בעל חיים")) // Hebrew
   expect(lexer.next(of_string("どうぶつ"))).toEqual(tokens.iDENTIFIER("どうぶつ")) // Japanese (Hiragana)
   expect(lexer.next(of_string("テレビ"))).toEqual(tokens.iDENTIFIER("テレビ")) // Japanese (Katakana)
   expect(lexer.next(of_string("ಪ್ರಾಣಿ"))).toEqual(tokens.iDENTIFIER("ಪ್ರಾಣಿ")) // Kannada
   expect(lexer.next(of_string("សត្វ"))).toEqual(tokens.iDENTIFIER("សត្វ")) // Khmer
   expect(lexer.next(of_string("ສັດ"))).toEqual(tokens.iDENTIFIER("ສັດ")) // Lao
   expect(lexer.next(of_string("മൃഗ"))).toEqual(tokens.iDENTIFIER("മൃഗ")) // Malayalam
   expect(lexer.next(of_string("တိရိစ္ဆာန်"))).toEqual(tokens.iDENTIFIER("တိရိစ္ဆာန်")) // Myanmar
   expect(lexer.next(of_string("සත්ව"))).toEqual(tokens.iDENTIFIER("සත්ව")) // Sinhala
   expect(lexer.next(of_string("கால்நடை"))).toEqual(tokens.iDENTIFIER("கால்நடை")) // Tamil
   expect(lexer.next(of_string("జంతు"))).toEqual(tokens.iDENTIFIER("జంతు")) // Telugu
   expect(lexer.next(of_string("สัตว์"))).toEqual(tokens.iDENTIFIER("สัตว์")) // Thai
   expect(lexer.next(of_string("ཨནིམལ་"))).toEqual(tokens.iDENTIFIER("ཨནིམལ་")) // Tibetan, Lhasa
})
