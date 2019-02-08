import lexer from '../src/lexer.bs'
import tokens from '../src/tokens.bs'
import {LexBuffer, Token} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

describe('Lexer, Unicode support', () => {
   // Yes, I used Google Translate. Don't h8.
   it('lexes identifiers in Arabic', () => {
      const tok = LexBuffer.of_string('حيوان_اليف').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('حيوان_اليف')
   })

   it('lexes identifiers in Armenian', () => {
      const tok = LexBuffer.of_string('կենդանիներ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('կենդանիներ')
   })

   it('lexes identifiers in Bengali', () => {
      const tok = LexBuffer.of_string('পশু').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('পশু')
   })

   it('lexes identifiers in Cyrillic (Russian)', () => {
      const tok = LexBuffer.of_string('животное').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('животное')
   })

   it('lexes identifiers in Hindi (Devanagari)', () => {
      const tok = LexBuffer.of_string('जानवर').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('जानवर')
   })

   it('lexes identifiers in Amharic (Ethiopic)', () => {
      const tok = LexBuffer.of_string('እንስሳ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('እንስሳ')
   })

   it('lexes identifiers in Georgian', () => {
      const tok = LexBuffer.of_string('ცხოველი').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ცხოველი')
   })

   it('lexes identifiers in Greek', () => {
      const tok = LexBuffer.of_string('ζώο').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ζώο')
   })

   it('lexes identifiers in Gujarati', () => {
      const tok = LexBuffer.of_string('પ્રાણી').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('પ્રાણી')
   })

   it('lexes identifiers in Chinese (Han)', () => {
      const tok = LexBuffer.of_string('動物').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('動物')
   })

   it('lexes identifiers in Korean (Hangul)', () => {
      const tok = LexBuffer.of_string('동물').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('동물')
   })

   it('lexes identifiers in Hebrew', () => {
      const tok = LexBuffer.of_string('חיים').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('חיים')
   })

   it('lexes identifiers in Japanese (Hiragana)', () => {
      const tok = LexBuffer.of_string('どうぶつ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('どうぶつ')
   })

   it('lexes identifiers in Japanese (Katakana)', () => {
      const tok = LexBuffer.of_string('テレビ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('テレビ')
   })

   it('lexes identifiers in Kannada', () => {
      const tok = LexBuffer.of_string('ಪ್ರಾಣಿ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ಪ್ರಾಣಿ')
   })

   it('lexes identifiers in Khmer', () => {
      const tok = LexBuffer.of_string('សត្វ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('សត្វ')
   })

   it('lexes identifiers in Lao', () => {
      const tok = LexBuffer.of_string('ສັດ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ສັດ')
   })

   it('lexes identifiers in Malayalam', () => {
      const tok = LexBuffer.of_string('മൃഗ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('മൃഗ')
   })

   it('lexes identifiers in Myanmar', () => {
      const tok = LexBuffer.of_string('တိရိစ္ဆာန်').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('တိရိစ္ဆာန်')
   })

   it('lexes identifiers in Sinhala', () => {
      const tok = LexBuffer.of_string('සත්ව').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('සත්ව')
   })

   it('lexes identifiers in Tamil', () => {
      const tok = LexBuffer.of_string('கால்நடை').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('கால்நடை')
   })

   it('lexes identifiers in Telugu', () => {
      const tok = LexBuffer.of_string('జంతు').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('జంతు')
   })

   it('lexes identifiers in Thai', () => {
      const tok = LexBuffer.of_string('สัตว์').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('สัตว์')
   })

   // FIXME: I can't figure out the TIBETAN TSHEG. A couple example words on Wikipedia *end* with
   //        it, like this example does; but the Unicode standard suggests it be allowed only in a
   //        medial position?
   it.skip('lexes identifiers in Tibetan, Lhasa', () => {
      const tok = LexBuffer.of_string('ཨནིམལ་').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ཨནིམལ་')
   })
})
