import { toFakeUTF8String, fromFakeUTF8String, fixBrokenBuckleScriptUTF8String } from '../src/fake_string'

it('encodes without throwing', ()=> {
   expect(()=> toFakeUTF8String('Hello, world!')).not.toThrow()
})

it('round-trips a Unicode string', ()=> {
   const source = "foo·bar"
   const fake_string = toFakeUTF8String(source)
   const result = fromFakeUTF8String(fake_string)
   expect(result).toEqual(source)
})

it('fixes a slightly mis-encoded BuckleScript string', ()=> {
   const broken = "fooÂ·bar"
   const result = fixBrokenBuckleScriptUTF8String(broken)
   expect(result).toEqual("foo·bar")
})
