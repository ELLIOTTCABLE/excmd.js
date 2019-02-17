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
      })

      describe('#statement entry-point', () => {
         it('returns an instance of the Statement interface', () => {
            const buf = LexBuffer.of_string("test"),
               statement = Parser.statement(buf)

            expect(statement).toBeInstanceOf(Statement)
         })
      })
   })

   describe('Script (objective wrapper)', () => {
      describe('#statements', () => {
         it('produces an array of objective `Statement`-proxies', () => {
            const buf = LexBuffer.of_string("foo; bar"),
               script = Parser.script(buf)

            expect(script.statements[0]).toBeInstanceOf(Statement)
         })

         it('produces an array of the correct length', () => {
            const buf = LexBuffer.of_string("foo; bar"),
               script = Parser.script(buf)

            expect(script.statements).toHaveLength(2)
         })
      })
   })

   describe('Statement (objective wrapper)', () => {
      describe('#statements', () => {
         it('produces an array of objective `Statement`-proxies', () => {
            const buf = LexBuffer.of_string("foo; bar"),
               script = Parser.script(buf)

            expect(script.statements[0]).toBeInstanceOf(Statement)
         })

         it('produces an array of the correct length', () => {
            const buf = LexBuffer.of_string("foo; bar"),
               script = Parser.script(buf)

            expect(script.statements).toHaveLength(2)
         })
      })
   })
})
