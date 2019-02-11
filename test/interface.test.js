import {Parser, LexBuffer, Script, Statement} from '../src/interface'
import {toFakeUTF8String, fromFakeUTF8String} from '../src/fake_string'

describe('JavaScript interface', () => {

   describe('Parser.script()', () => {
      it('returns an instance of the Script interface', () => {
         const buf = LexBuffer.of_string("test"),
            script = Parser.script(buf)

         expect(script).toBeInstanceOf(Script)
      })
   })

   describe('Script (wrapper class)', () => {
      describe('#statements', () => {
         it('#statements ', () => {
            const buf = LexBuffer.of_string("foo; bar"),
               script = Parser.script(buf)

            expect(script.statements).toHaveLength(2)
         })
      })
   })
})
