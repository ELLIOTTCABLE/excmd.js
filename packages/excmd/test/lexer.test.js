import {LexBuffer, Token} from '../src/excmd'

describe('Lexer (objective interface)', () => {
   it.skip('lexes an EOF', () => {
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
