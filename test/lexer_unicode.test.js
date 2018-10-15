import lexer from '../src/lexer.bs'
import tokens from '../src/tokens.bs'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

let of_string = function(js_string) {
   const utf8_arr = toFakeUTF8String(js_string)
   return lexer.buffer_of_string(utf8_arr)
}

describe('Lexer, Unicode support', () => {
   // Yes, I used Google Translate. Don't h8.
   it('lexes identifiers in non-English scripts', () => {
      expect(lexer.next(of_string('حيوان_اليف'))).toEqual(tokens.iDENTIFIER('حيوان_اليف')) // Arabic
      expect(lexer.next(of_string('կենդանիներ'))).toEqual(tokens.iDENTIFIER('կենդանիներ')) // Armenian
      expect(lexer.next(of_string('পশু'))).toEqual(tokens.iDENTIFIER('পশু')) // Bengali
      expect(lexer.next(of_string('животное'))).toEqual(tokens.iDENTIFIER('животное')) // Cyrillic (Russian)
      expect(lexer.next(of_string('जानवर'))).toEqual(tokens.iDENTIFIER('जानवर')) // Hindi (Devanagari)
      expect(lexer.next(of_string('እንስሳ'))).toEqual(tokens.iDENTIFIER('እንስሳ')) // Amharic (Ethiopic)
      expect(lexer.next(of_string('ცხოველი'))).toEqual(tokens.iDENTIFIER('ცხოველი')) // Georgian
      expect(lexer.next(of_string('ζώο'))).toEqual(tokens.iDENTIFIER('ζώο')) // Greek
      expect(lexer.next(of_string('પ્રાણી'))).toEqual(tokens.iDENTIFIER('પ્રાણી')) // Gujarati
      expect(lexer.next(of_string('動物'))).toEqual(tokens.iDENTIFIER('動物')) // Chinese (Han)
      expect(lexer.next(of_string('동물'))).toEqual(tokens.iDENTIFIER('동물')) // Korean (Hangul)
      expect(lexer.next(of_string('בעל חיים'))).toEqual(tokens.iDENTIFIER('בעל חיים')) // Hebrew
      expect(lexer.next(of_string('どうぶつ'))).toEqual(tokens.iDENTIFIER('どうぶつ')) // Japanese (Hiragana)
      expect(lexer.next(of_string('テレビ'))).toEqual(tokens.iDENTIFIER('テレビ')) // Japanese (Katakana)
      expect(lexer.next(of_string('ಪ್ರಾಣಿ'))).toEqual(tokens.iDENTIFIER('ಪ್ರಾಣಿ')) // Kannada
      expect(lexer.next(of_string('សត្វ'))).toEqual(tokens.iDENTIFIER('សត្វ')) // Khmer
      expect(lexer.next(of_string('ສັດ'))).toEqual(tokens.iDENTIFIER('ສັດ')) // Lao
      expect(lexer.next(of_string('മൃഗ'))).toEqual(tokens.iDENTIFIER('മൃഗ')) // Malayalam
      expect(lexer.next(of_string('တိရိစ္ဆာန်'))).toEqual(tokens.iDENTIFIER('တိရိစ္ဆာန်')) // Myanmar
      expect(lexer.next(of_string('සත්ව'))).toEqual(tokens.iDENTIFIER('සත්ව')) // Sinhala
      expect(lexer.next(of_string('கால்நடை'))).toEqual(tokens.iDENTIFIER('கால்நடை')) // Tamil
      expect(lexer.next(of_string('జంతు'))).toEqual(tokens.iDENTIFIER('జంతు')) // Telugu
      expect(lexer.next(of_string('สัตว์'))).toEqual(tokens.iDENTIFIER('สัตว์')) // Thai
      expect(lexer.next(of_string('ཨནིམལ་'))).toEqual(tokens.iDENTIFIER('ཨནིམལ་')) // Tibetan, Lhasa
   })
})
