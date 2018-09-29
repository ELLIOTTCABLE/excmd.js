import createFakeUTF8String from '../src/fake_string'

test('constructs', ()=> {
   expect(()=> createFakeUTF8String('Hello, world!')).not.toThrow()
})
