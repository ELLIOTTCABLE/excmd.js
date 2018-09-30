import { toFakeUTF8String, fromFakeUTF8String } from '../src/fake_string'

test('encodes without throwing', ()=> {
   expect(()=> toFakeUTF8String('Hello, world!')).not.toThrow()
})

test('round-trips a Unicode string', ()=> {
   const source = "foo·bar"
   const fake_string = toFakeUTF8String(source)
   const result = fromFakeUTF8String(fake_string)
   expect(result).toEqual(source)
})
