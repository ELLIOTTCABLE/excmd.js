import lexer from '../src/lexer.bs'
import tokens from '../src/tokens.bs'
import { toFakeUTF8String, fromFakeUTF8String } from '../src/fake_string'

let of_string = function(js_string) {
   const utf8_arr = toFakeUTF8String(js_string)
   return lexer.buffer_of_string(utf8_arr)
}

test('lexes an EOF', ()=> {
   const buf = of_string('')
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("EOF")
})

test('lexes a single-character identifier', ()=> {
   const buf = of_string("a")
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("IDENTIFIER")
   expect(lexer.token_body(tok)).toEqual("a")
})

test('lexes a simple identifier', ()=> {
   const buf = of_string("hello")
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("IDENTIFIER")
   expect(lexer.token_body(tok)).toEqual("hello")
})

test('provides character-location information', ()=> {
                      /* '01234' */
   const buf = of_string(' ( ) ')
       , loc = lexer.next_loc(buf)
       , tok = lexer.token(loc)

   expect(lexer.show_token(tok)).toEqual("LEFT_PAREN")
   expect(lexer.start_cnum(loc)).toBe(1)
})

// FIXME: Inexplicably, Sedlex's line-counting doesn't seem to be working
test.skip('provides line-location information', ()=> {
   const buf = of_string("\n"    // 0
      + " ( ) \n"                // 1
      + "")                      // 2

   const loc = lexer.next_loc(buf)
       , tok = lexer.token(loc)

   expect(lexer.show_token(tok)).toEqual("LEFT_PAREN")
   expect(lexer.start_lnum(loc)).toBe(1)
})

test('lexes a linewise comment', ()=> {
   const buf = of_string(`
      // This is a line-wise comment
   `)
       , comment = " This is a line-wise comment"
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("COMMENT_LINE")
   expect(lexer.token_body(tok)).toEqual(comment)
})

test('lexes a linewise comment after another token', ()=> {
   const buf = of_string(`
      ( // This is a line-wise comment
      )
   `)
       , comment = " This is a line-wise comment"
       , _   = lexer.next(buf) // Discard one token
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("COMMENT_LINE")
   expect(lexer.token_body(tok)).toEqual(comment)
})

test('lexes other tokens after a linewise comment', ()=> {
   const buf = of_string(`
      ( // This is a line-wise comment
      )
   `)
       , _   = lexer.next(buf) // Discard one token
       , __  = lexer.next(buf) // Discard another token
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("RIGHT_PAREN")
})

test('does not lex normal tokens inside a linewise comment', ()=> {
   const buf = of_string(`
      ( // )
   `)
       , _   = lexer.next(buf) // Discard one token
       , __  = lexer.next(buf) // Discard another token
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).not.toEqual("RIGHT_PAREN")
})

test('lexes a blockwise comment', ()=> {
   const buf = of_string(`
      /* This is a block-wise comment */
   `)
       , comment = " This is a block-wise comment "
       , tok1 = lexer.next(buf)
       , tok2 = lexer.next(buf)
       , tok3 = lexer.next(buf)

   expect(lexer.show_token(tok1)).toBe("LEFT_COMMENT_DELIM")
   expect(lexer.show_token(tok2)).toBe("COMMENT_CHUNK")
   expect(lexer.token_body(tok2)).toBe(comment)
   expect(lexer.show_token(tok3)).toBe("RIGHT_COMMENT_DELIM")
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
       , tok1 = lexer.next(buf)
       , tok2 = lexer.next(buf)
       , tok3 = lexer.next(buf)

   expect(lexer.show_token(tok1)).toBe("LEFT_COMMENT_DELIM")
   expect(lexer.show_token(tok2)).toBe("COMMENT_CHUNK")
   expect(lexer.token_body(tok2)).toBe(comment)
   expect(lexer.show_token(tok3)).toBe("RIGHT_COMMENT_DELIM")
})

test('lexes a blockwise comment after another token', ()=> {
   const buf = of_string(`
      ( /* This is a block-wise comment */ )
   `)
       , comment = " This is a block-wise comment "
       , _    = lexer.next(buf) // Discard one token
       , tok1 = lexer.next(buf)
       , tok2 = lexer.next(buf)
       , tok3 = lexer.next(buf)

   expect(lexer.show_token(tok1)).toBe("LEFT_COMMENT_DELIM")
   expect(lexer.show_token(tok2)).toBe("COMMENT_CHUNK")
   expect(lexer.token_body(tok2)).toBe(comment)
   expect(lexer.show_token(tok3)).toBe("RIGHT_COMMENT_DELIM")
})

test('lexes other tokens after a blockwise comment', ()=> {
   const buf = of_string(`
      ( /* This is a block-wise comment */ )
   `)

   // Discard four tokens
   lexer.next(buf); lexer.next(buf); lexer.next(buf); lexer.next(buf);

   expect(lexer.show_token(lexer.next(buf))).toBe("RIGHT_PAREN")
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

   expect(lexer.show_token(lexer.next(buf))).toBe("LEFT_COMMENT_DELIM")

   const tok1 = lexer.next(buf)
   expect(lexer.show_token(tok1)).toBe("COMMENT_CHUNK")
   expect(lexer.token_body(tok1)).toBe(first)

   expect(lexer.show_token(lexer.next(buf))).toBe("LEFT_COMMENT_DELIM")

   const tok2 = lexer.next(buf)
   expect(lexer.show_token(tok2)).toBe("COMMENT_CHUNK")
   expect(lexer.token_body(tok2)).toBe(second)

   expect(lexer.show_token(lexer.next(buf))).toBe("RIGHT_COMMENT_DELIM")

   const tok3 = lexer.next(buf)
   expect(lexer.show_token(tok3)).toBe("COMMENT_CHUNK")
   expect(lexer.token_body(tok3)).toBe(third)

   expect(lexer.show_token(lexer.next(buf))).toBe("RIGHT_COMMENT_DELIM")
})

test('lexes a non-ASCII identifier', ()=> {
   const buf = of_string("foo·bar")
       , tok = lexer.next(buf)

   expect(lexer.show_token(tok)).toEqual("IDENTIFIER")
   const body = lexer.token_body(tok)

   expect(fromFakeUTF8String(body)).toEqual("foo·bar")
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
