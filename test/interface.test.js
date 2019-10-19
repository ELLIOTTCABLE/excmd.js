import {Parser, LexBuffer, Script, Expression} from '../src/interface'

describe('JavaScript interface', () => {
   describe('Parser.script()', () => {
      describe('#script entry-point', () => {
         it('returns an instance of the Script interface', () => {
            const buf = LexBuffer.ofString('test'),
               script = Parser.script(buf)

            expect(script).toBeInstanceOf(Script)
         })

         it('can be invoked as #scriptOfString', () => {
            const script = Parser.scriptOfString('test')

            expect(script).toBeInstanceOf(Script)
         })
      })

      describe('#expression entry-point', () => {
         it('returns an instance of the Expression interface', () => {
            const buf = LexBuffer.ofString('test'),
               expression = Parser.expression(buf)

            expect(expression).toBeInstanceOf(Expression)
         })

         it('can be invoked as #expressionOfString', () => {
            const expression = Parser.expressionOfString('test')

            expect(expression).toBeInstanceOf(Expression)
         })
      })
   }) // Parser.script()

   describe('Script (objective wrapper)', () => {
      describe('#expressions', () => {
         it('produces an array of objective `Expression`-proxies', () => {
            const script = Parser.scriptOfString('foo; bar')

            expect(script.expressions[0]).toBeInstanceOf(Expression)
         })

         it('produces an array of the correct length', () => {
            const script = Parser.scriptOfString('foo; bar')

            expect(script.expressions).toHaveLength(2)
         })
      })
   }) // Script

   describe('Expression (objective wrapper)', () => {
      describe('#expressions', () => {
         it('produces an array of objective `Expression`-proxies', () => {
            const script = Parser.scriptOfString('foo; bar')

            expect(script.expressions[0]).toBeInstanceOf(Expression)
         })

         it('produces an array of the correct length', () => {
            const script = Parser.scriptOfString('foo; bar')

            expect(script.expressions).toHaveLength(2)
         })
      })

      describe('Simple accessors', () => {
         it('#count', () => {
            const expr = Parser.expressionOfString('2test')

            expect(expr.count).toBe(2)
         })

         it('#command', () => {
            const expr = Parser.expressionOfString('2test')

            expect(expr.command).toBe('test')
         })
      })

      describe('Argument-list processing', () => {
         it('#hasFlag checks for presence or absences of a flag', () => {
            const expr = Parser.expressionOfString('foo --bar')

            expect(expr.hasFlag('bar')).toBe(true)
            expect(expr.hasFlag('widget')).toBe(false)
         })

         it('#getPositionals returns an array of positional arguments', () => {
            const expr = Parser.expressionOfString('foo qux quux'),
               positionals = expr.getPositionals()

            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual(['qux', 'quux'])
         })

         it('#getPositionals prevents a subsequent getFlag from resolving a consumed arg', () => {
            const expr = Parser.expressionOfString('foo --bar qux quux'),
               positionals = expr.getPositionals(),
               payload = expr.getFlag('bar')

            expect(positionals).toEqual(['qux', 'quux'])
            expect(payload).not.toBe('qux')
         })

         it('#getFlag returns a string payload for a present argument', () => {
            const expr = Parser.expressionOfString('foo --bar=baz'),
               payload = expr.getFlag('bar')

            expect(typeof payload).toBe('string')
            expect(payload).toEqual('baz')
         })

         it('#getFlag prevents a subsequent getPositionals from resolving a consumed arg', () => {
            const expr = Parser.expressionOfString('foo --bar qux quux'),
               payload = expr.getFlag('bar'),
               positionals = expr.getPositionals()

            expect(payload).toBe('qux')
            expect(positionals).not.toContain('qux')
         })
      })
   }) // Expression
})
