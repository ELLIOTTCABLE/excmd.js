import lexer from '../src/lexer.bs'
import tokens from '../src/tokens.bs'
import {LexBuffer, Token} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

describe('Lexer, Unicode support', () => {
   // Yes, I used Google Translate. Don't h8.
   it('lexes identifiers in Arabic', () => {
      const tok = LexBuffer.ofString('حيوان_اليف').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('حيوان_اليف')
   })

   it('lexes identifiers in Armenian', () => {
      const tok = LexBuffer.ofString('կենդանիներ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('կենդանիներ')
   })

   it('lexes identifiers in Bengali', () => {
      const tok = LexBuffer.ofString('পশু').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('পশু')
   })

   it('lexes identifiers in Cyrillic (Russian)', () => {
      const tok = LexBuffer.ofString('животное').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('животное')
   })

   it('lexes identifiers in Hindi (Devanagari)', () => {
      const tok = LexBuffer.ofString('जानवर').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('जानवर')
   })

   it('lexes identifiers in Amharic (Ethiopic)', () => {
      const tok = LexBuffer.ofString('እንስሳ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('እንስሳ')
   })

   it('lexes identifiers in Georgian', () => {
      const tok = LexBuffer.ofString('ცხოველი').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ცხოველი')
   })

   it('lexes identifiers in Greek', () => {
      const tok = LexBuffer.ofString('ζώο').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ζώο')
   })

   it('lexes identifiers in Gujarati', () => {
      const tok = LexBuffer.ofString('પ્રાણી').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('પ્રાણી')
   })

   it('lexes identifiers in Chinese (Han)', () => {
      const tok = LexBuffer.ofString('動物').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('動物')
   })

   it('lexes identifiers in Korean (Hangul)', () => {
      const tok = LexBuffer.ofString('동물').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('동물')
   })

   it('lexes identifiers in Hebrew', () => {
      const tok = LexBuffer.ofString('חיים').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('חיים')
   })

   it('lexes identifiers in Japanese (Hiragana)', () => {
      const tok = LexBuffer.ofString('どうぶつ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('どうぶつ')
   })

   it('lexes identifiers in Japanese (Katakana)', () => {
      const tok = LexBuffer.ofString('テレビ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('テレビ')
   })

   it('lexes identifiers in Kannada', () => {
      const tok = LexBuffer.ofString('ಪ್ರಾಣಿ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ಪ್ರಾಣಿ')
   })

   it('lexes identifiers in Khmer', () => {
      const tok = LexBuffer.ofString('សត្វ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('សត្វ')
   })

   it('lexes identifiers in Lao', () => {
      const tok = LexBuffer.ofString('ສັດ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ສັດ')
   })

   it('lexes identifiers in Malayalam', () => {
      const tok = LexBuffer.ofString('മൃഗ').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('മൃഗ')
   })

   it('lexes identifiers in Myanmar', () => {
      const tok = LexBuffer.ofString('တိရိစ္ဆာန်').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('တိရိစ္ဆာန်')
   })

   it('lexes identifiers in Sinhala', () => {
      const tok = LexBuffer.ofString('සත්ව').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('සත්ව')
   })

   it('lexes identifiers in Tamil', () => {
      const tok = LexBuffer.ofString('கால்நடை').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('கால்நடை')
   })

   it('lexes identifiers in Telugu', () => {
      const tok = LexBuffer.ofString('జంతు').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('జంతు')
   })

   it('lexes identifiers in Thai', () => {
      const tok = LexBuffer.ofString('สัตว์').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('สัตว์')
   })

   // FIXME: I can't figure out the TIBETAN TSHEG. A couple example words on Wikipedia *end* with
   //        it, like this example does; but the Unicode standard suggests it be allowed only in a
   //        medial position?
   it.skip('lexes identifiers in Tibetan, Lhasa', () => {
      const tok = LexBuffer.ofString('ཨནིམལ་').next()
      expect(tok.id).toEqual(Symbol.for('IDENTIFIER'))
      expect(tok.body).toEqual('ཨནིམལ་')
   })
})
