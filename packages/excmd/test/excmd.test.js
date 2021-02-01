import {Parser, LexBuffer, Script, Expression} from '../src/excmd'

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

      describe('Copying', () => {
         it('#clone creates a copy of an Expression', () => {
            const orig = Parser.expressionOfString('2test'),
               nuevo = orig.clone()

            expect(nuevo.count).toBe(2)
            expect(nuevo.command.value).toBe('test')
         })

         it("#clone produces a *new* Expression that doesn't mutate the original", () => {
            // An expression that requires mutation to access
            const orig = Parser.expressionOfString('cmd --flg mby fosho'),
               nuevo = orig.clone()

            // Mutate the clone,
            expect(nuevo.getPositionals()).toContainEqual({type: 'literal', value: 'mby'})
            // then check the original
            expect(orig.getFlag('flg')).toEqual({type: 'literal', value: 'mby'})
         })
      })

      describe('Recursive evaluation', () => {
         it('#cloneWithEvaluatorSync creates a recursively-evaluating copy of an expression', () => {
            const orig = Parser.expressionOfString('2test'),
               noop = jest.fn(() => ''),
               nuevo = orig.cloneWithEvaluatorSync(noop)

            expect(nuevo.count).toBe(2)
            expect(nuevo.command).toBe('test')
         })

         it("#cloneWithEvaluatorSync produces a *new* ExpressionEval that doesn't mutate the original", () => {
            // An expression that requires mutation to access
            const orig = Parser.expressionOfString('cmd --flg mby fosho'),
               noop = jest.fn(() => ''),
               nuevo = orig.cloneWithEvaluatorSync(noop)

            // Mutate the clone,
            expect(nuevo.getPositionals()).toContain('mby')
            // then check the original
            expect(orig.getFlag('flg')).toEqual({type: 'literal', value: 'mby'})
         })
      })

      describe('Accessors', () => {
         it('#count', () => {
            const expr = Parser.expressionOfString('2test')

            expect(expr.count).toBe(2)
         })

         it('#command, unevaluated, produces a literal', () => {
            const expr = Parser.expressionOfString('2test')

            expect(expr.command.type).toBe('literal')
            expect(expr.command.value).toBe('test')
         })

         it('#evalCommandSync reduces a literal to a string', () => {
            const expr = Parser.expressionOfString('2test'),
               noop = jest.fn(() => '')

            expect(expr.evalCommandSync(noop)).toBe('test')
            expect(noop).not.toBeCalled()
         })
      })

      describe('Argument-list processing', () => {
         it('#hasFlag checks for presence or absences of a flag', () => {
            const expr = Parser.expressionOfString('foo --bar')

            expect(expr.hasFlag('bar')).toBe(true)
            expect(expr.hasFlag('widget')).toBe(false)
         })

         it('#getPositionals, unevaluated, returns an array of positional-argument literals', () => {
            const expr = Parser.expressionOfString('foo qux quux'),
               positionals = expr.getPositionals()

            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual([
               {type: 'literal', value: 'qux'},
               {type: 'literal', value: 'quux'},
            ])
         })

         it('#evalPositionalsSync returns an array of positional arguments evaluated into strings', () => {
            const expr = Parser.expressionOfString('foo qux quux'),
               noop = jest.fn(() => ''),
               positionals = expr.evalPositionalsSync(noop)

            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual(['qux', 'quux'])
            expect(noop).not.toBeCalled()
         })

         it('#getFlag returns an undefined payload for an absent argument', () => {
            const expr = Parser.expressionOfString('foo --bar'),
               payload = expr.getFlag('bar')

            expect(typeof payload).toBe('undefined')
         })

         it('#getFlag, unevaluated, returns a literal payload for a present argument', () => {
            const expr = Parser.expressionOfString('foo --bar=baz'),
               payload = expr.getFlag('bar')

            expect(typeof payload).toBe('object')
            expect(payload).toEqual({type: 'literal', value: 'baz'})
         })

         it('#evalFlagSync returns a string payload for a present argument', () => {
            const expr = Parser.expressionOfString('foo --bar=baz'),
               noop = jest.fn(() => ''),
               payload = expr.evalFlagSync(noop, 'bar')

            expect(typeof payload).toBe('string')
            expect(payload).toEqual('baz')
         })

         it('#getFlag prevents a subsequent getPositionals from resolving a consumed arg', () => {
            const expr = Parser.expressionOfString('foo --bar qux quux')

            expect(expr.getFlag('bar')).toEqual({type: 'literal', value: 'qux'})
            expect(expr.getPositionals()).not.toContainEqual({
               type: 'literal',
               value: 'qux',
            })
         })

         it('#getPositionals prevents a subsequent getFlag from resolving a consumed arg', () => {
            const expr = Parser.expressionOfString('foo --bar qux quux')

            expect(expr.getPositionals()).toEqual([
               {type: 'literal', value: 'qux'},
               {type: 'literal', value: 'quux'},
            ])
            expect(expr.getFlag('bar')).toBe(undefined)
         })
      })
      // TODO: Excercise the passing of recursive ExpressionEvals to the evaluators given to an
      //       ExpressionEval, i.e. that you don't nned to use .evalFlagSync() inside the body of an
      //       evaluator. (pending subexpression impl.)
   }) // Expression
})
