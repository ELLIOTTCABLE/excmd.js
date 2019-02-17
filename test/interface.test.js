import {Parser, LexBuffer, Script, Statement} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

describe('JavaScript interface', () => {

   describe('Parser.script()', () => {
      describe('#script entry-point', () => {
         it('returns an instance of the Script interface', () => {
            const buf = LexBuffer.of_string("test"),
               script = Parser.script(buf)

            expect(script).toBeInstanceOf(Script)
         })

         it('can be invoked as #script_of_string', () => {
            const script = Parser.script_of_string("test")

            expect(script).toBeInstanceOf(Script)
         })
      })

      describe('#statement entry-point', () => {
         it('returns an instance of the Statement interface', () => {
            const buf = LexBuffer.of_string("test"),
               statement = Parser.statement(buf)

            expect(statement).toBeInstanceOf(Statement)
         })

         it('can be invoked as #statement_of_string', () => {
            const statement = Parser.statement_of_string("test")

            expect(statement).toBeInstanceOf(Statement)
         })
      })
   }) // Parser.script()

   describe('Script (objective wrapper)', () => {
      describe('#statements', () => {
         it('produces an array of objective `Statement`-proxies', () => {
            const script = Parser.script_of_string("foo; bar")

            expect(script.statements[0]).toBeInstanceOf(Statement)
         })

         it('produces an array of the correct length', () => {
            const script = Parser.script_of_string("foo; bar")

            expect(script.statements).toHaveLength(2)
         })
      })
   }) // Script

   describe('Statement (objective wrapper)', () => {
      describe('#statements', () => {
         it('produces an array of objective `Statement`-proxies', () => {
            const script = Parser.script_of_string("foo; bar")

            expect(script.statements[0]).toBeInstanceOf(Statement)
         })

         it('produces an array of the correct length', () => {
            const script = Parser.script_of_string("foo; bar")

            expect(script.statements).toHaveLength(2)
         })
      })

      describe('Simple accessors', () => {
         it('#count', () => {
            const script = Parser.script_of_string("2test")

            expect(stmt.count).toBe(2)
         })

         it('#command', () => {
            const script = Parser.script_of_string("2test")

            expect(stmt.command).toBe("test")
         })
      })

      describe('Argument-list processing', () => {
         it('#has_flag checks for presence or absences of a flag', () => {
            const stmt = Parser.statement_of_string("foo --bar")

            expect(stmt.has_flag('bar')).toBe(true)
            expect(stmt.has_flag('widget')).toBe(false)
         })
      })
   }) // Statement
})
