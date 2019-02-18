import {Parser, LexBuffer, Script, Statement} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

describe('JavaScript interface', () => {

   describe('Parser.script()', () => {
      describe('#script entry-point', () => {
         it('returns an instance of the Script interface', () => {
            const buf = LexBuffer.ofString("test"),
               script = Parser.script(buf)

            expect(script).toBeInstanceOf(Script)
         })

         it('can be invoked as #scriptOfString', () => {
            const script = Parser.scriptOfString("test")

            expect(script).toBeInstanceOf(Script)
         })
      })

      describe('#statement entry-point', () => {
         it('returns an instance of the Statement interface', () => {
            const buf = LexBuffer.ofString("test"),
               statement = Parser.statement(buf)

            expect(statement).toBeInstanceOf(Statement)
         })

         it('can be invoked as #statementOfString', () => {
            const statement = Parser.statementOfString("test")

            expect(statement).toBeInstanceOf(Statement)
         })
      })
   }) // Parser.script()

   describe('Script (objective wrapper)', () => {
      describe('#statements', () => {
         it('produces an array of objective `Statement`-proxies', () => {
            const script = Parser.scriptOfString("foo; bar")

            expect(script.statements[0]).toBeInstanceOf(Statement)
         })

         it('produces an array of the correct length', () => {
            const script = Parser.scriptOfString("foo; bar")

            expect(script.statements).toHaveLength(2)
         })
      })
   }) // Script

   describe('Statement (objective wrapper)', () => {
      describe('#statements', () => {
         it('produces an array of objective `Statement`-proxies', () => {
            const script = Parser.scriptOfString("foo; bar")

            expect(script.statements[0]).toBeInstanceOf(Statement)
         })

         it('produces an array of the correct length', () => {
            const script = Parser.scriptOfString("foo; bar")

            expect(script.statements).toHaveLength(2)
         })
      })

      describe('Simple accessors', () => {
         it('#count', () => {
            const stmt = Parser.statementOfString("2test")

            expect(stmt.count).toBe(2)
         })

         it('#command', () => {
            const stmt = Parser.statementOfString("2test")

            expect(stmt.command).toBe("test")
         })
      })

      describe('Argument-list processing', () => {
         it('#hasFlag checks for presence or absences of a flag', () => {
            const stmt = Parser.statementOfString("foo --bar")

            expect(stmt.hasFlag('bar')).toBe(true)
            expect(stmt.hasFlag('widget')).toBe(false)
         })

         it('#getPositionals returns an array of positional arguments', () => {
            const stmt = Parser.statementOfString("foo qux quux"),
               positionals = stmt.getPositionals()

            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual(['qux', 'quux'])
         })

         it('#getPositionals prevents a subsequent getFlag from resolving a consumed arg', () => {
            const stmt = Parser.statementOfString("foo --bar qux quux"),
               positionals = stmt.getPositionals(),
               payload = stmt.getFlag('bar')

            expect(positionals).toEqual(['qux', 'quux'])
            expect(payload).not.toBe('qux')
         })

         it('#getFlag returns a string payload for a present argument', () => {
            const stmt = Parser.statementOfString("foo --bar=baz"),
               payload = stmt.getFlag('bar')

            expect(typeof payload).toBe('string')
            expect(payload).toEqual('baz')
         })

         it('#getFlag prevents a subsequent getPositionals from resolving a consumed arg', () => {
            const stmt = Parser.statementOfString("foo --bar qux quux"),
               payload = stmt.getFlag('bar'),
               positionals = stmt.getPositionals()

            expect(payload).toBe('qux')
            expect(positionals).not.toContain('qux')
         })
      })
   }) // Statement
})
