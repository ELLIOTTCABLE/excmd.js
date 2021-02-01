import {jest} from '@jest/globals'

import {
   Parser,
   LexBuffer,
   Script,
   Expression,
   ExpressionEval,
   ExpressionEvalSync,
} from '../src/excmd'

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

         it("#cloneWithEvaluatorSync produces a *new* ExpressionEval that doesn't mutate the original", () => {
            // An expression that requires mutation to access
            const orig = Parser.expressionOfString('cmd --flg mby fosho'),
               noop = jest.fn(() => '').mockName('noop'),
               nuevo = orig.cloneWithEvaluatorSync(noop)

            // Mutate the clone,
            expect(nuevo.getPositionals()).toContain('mby')
            // then check the original
            expect(orig.getFlag('flg')).toEqual({type: 'literal', value: 'mby'})
         })

         it("#cloneWithEvaluator produces a *new* (async) ExpressionEval that doesn't mutate the original", async () => {
            // An expression that requires mutation to access
            const orig = Parser.expressionOfString('cmd --flg mby fosho'),
               noop = jest.fn(async () => '').mockName('noop'),
               nuevo = orig.cloneWithEvaluator(noop)

            // Mutate the clone,
            expect(await nuevo.getPositionals()).toContain('mby')
            // then check the original
            expect(await orig.getFlag('flg')).toEqual({type: 'literal', value: 'mby'})
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
               noop = jest.fn(() => '').mockName('noop')

            expect(expr.evalCommandSync(noop)).toBe('test')
         })

         it("#evalCommandSync doesn't invoke the evaluator without subexpressions", () => {
            const expr = Parser.expressionOfString('2test'),
               evl = jest.fn(() => '').mockName('evl')

            expr.evalCommandSync(evl)
            expect(evl).not.toBeCalled()
         })

         it('#evalCommandSync calls a provided evaluator with a subexpression', () => {
            const expr = Parser.expressionOfString('2(3echo actual_command)'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl')

            expect(expr.evalCommandSync(evl)).toBe('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEvalSync)
            expect(arg.count).toBe(3)
         })

         it('#evalCommandSync recursively reduces literals in subexpressions', () => {
            const expr = Parser.expressionOfString('2(3echo actual_command)'),
               evl = jest.fn(subexpr => '').mockName('evl')

            expr.evalCommandSync(evl)
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.command).toBe('echo')
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#evalCommandSync recursively invokes the given evaluator', () => {
            const expr = Parser.expressionOfString('2(3(echo actual_command))'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl')

            expr.evalCommandSync(evl)
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.command).toBe('fixed_result')
            expect(evl).toHaveBeenCalledTimes(2)
         })
      })

      describe('Argument-list processing', () => {
         it('#hasFlag checks for presence or absences of a flag', () => {
            const expr = Parser.expressionOfString('foo --bar')

            expect(expr.hasFlag('bar')).toBe(true)
            expect(expr.hasFlag('widget')).toBe(false)
         })

         it('#hasFlag does not mutate the expression', () => {
            const expr = Parser.expressionOfString('cmd --flg mby fosho')

            // Check for the flag,
            expect(expr.hasFlag('flg')).toBe(true)
            // Mutate it away,
            expect(expr.getPositionals()).toContainEqual({type: 'literal', value: 'mby'})
            // then check it again
            expect(expr.hasFlag('flg')).toBe(true)
            expect(expr.getFlag('flg')).toBeUndefined()
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

         it('#evalPositionalsSync returns an array of literal positional arguments evaluated into strings', () => {
            const expr = Parser.expressionOfString('foo qux quux'),
               noop = jest.fn(() => '').mockName('noop'),
               positionals = expr.evalPositionalsSync(noop)

            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual(['qux', 'quux'])
            expect(noop).not.toBeCalled()
         })

         it("#evalPositionalsSync doesn't invoke the evaluator without subexpressions", () => {
            const expr = Parser.expressionOfString('foo qux quux'),
               evl = jest.fn(() => '').mockName('evl')

            expr.evalPositionalsSync(evl)
            expect(evl).not.toBeCalled()
         })

         it('#evalPositionalsSync calls a provided evaluator with a subexpression', () => {
            const expr = Parser.expressionOfString('foo (echo qux) quux'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl')

            expect(expr.evalPositionalsSync(evl)).toContainEqual('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEvalSync)
         })

         it('#evalPositionalsSync recursively reduces literals in subexpressions', () => {
            const expr = Parser.expressionOfString('foo (echo qux) quux'),
               evl = jest.fn(subexpr => '').mockName('evl')

            expr.evalPositionalsSync(evl)
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getPositionals()).toEqual(['qux'])
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#evalPositionalsSync recursively invokes the given evaluator', () => {
            const expr = Parser.expressionOfString('foo (echo (echo qux)) quux'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl')

            expr.evalPositionalsSync(evl)
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getPositionals()).toEqual(['fixed_result'])
            expect(evl).toHaveBeenCalledTimes(2)
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

         it('#evalFlagSync returns a string payload for a present, literal argument', () => {
            const expr = Parser.expressionOfString('foo --bar=baz'),
               noop = jest.fn(() => '').mockName('noop'),
               payload = expr.evalFlagSync(noop, 'bar')

            expect(typeof payload).toBe('string')
            expect(payload).toEqual('baz')
         })

         it("#evalFlagSync doesn't invoke the evaluator without subexpressions", () => {
            const expr = Parser.expressionOfString('foo --bar=baz'),
               evl = jest.fn(() => '').mockName('evl')

            expr.evalFlagSync(evl, 'bar')
            expect(evl).not.toBeCalled()
         })

         it('#evalFlagSync calls a provided evaluator with a subexpression', () => {
            const expr = Parser.expressionOfString('foo --bar=(echo baz)'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl')

            expect(expr.evalFlagSync(evl, 'bar')).toBe('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEvalSync)
         })

         it("#evalFlagSync doesn't call the provided evaluator if the flag isn't preset", () => {
            const expr = Parser.expressionOfString('foo --bar=(echo baz)'),
               evl = jest.fn(() => '').mockName('evl')

            expect(expr.evalFlagSync(evl, 'widget')).toBe(undefined)
            expect(evl).not.toBeCalled()
         })

         it('#evalFlagSync recursively reduces literals in subexpressions', () => {
            const expr = Parser.expressionOfString('foo --bar=(echo --qux=baz)'),
               evl = jest.fn(subexpr => '').mockName('evl')

            expr.evalFlagSync(evl, 'bar')
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getFlag('qux')).toBe('baz')
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#evalFlagSync recursively invokes the given evaluator', () => {
            const expr = Parser.expressionOfString('foo --bar=(echo --qux=(echo baz))'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl')

            expr.evalFlagSync(evl, 'bar')
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getFlag('qux')).toBe('fixed_result')
            expect(evl).toHaveBeenCalledTimes(2)
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
   }) // Expression

   describe('ExpressionEvalSync', () => {
      describe('Accessors', () => {
         it('#count', () => {
            const rawExpr = Parser.expressionOfString('2test'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.count).toBe(2)
            expect(evl).not.toBeCalled()
         })

         it('#command produces a string', () => {
            const rawExpr = Parser.expressionOfString('2test'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.command).toBe('test')
         })

         it("#command doesn't invoke the evaluator without subexpressions", () => {
            const rawExpr = Parser.expressionOfString('2test'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.command
            expect(evl).not.toBeCalled()
         })

         it('#command calls a provided evaluator with a subexpression', () => {
            const rawExpr = Parser.expressionOfString('2(3echo actual_command)'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.command).toBe('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEvalSync)
            expect(arg.count).toBe(3)
         })

         it('#command recursively reduces literals in subexpressions', () => {
            const rawExpr = Parser.expressionOfString('2(3echo actual_command)'),
               evl = jest.fn(subexpr => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.command
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.command).toBe('echo')
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#command recursively invokes the given evaluator', () => {
            const rawExpr = Parser.expressionOfString('2(3(echo actual_command))'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.command
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.command).toBe('fixed_result')
            expect(evl).toHaveBeenCalledTimes(2)
         })
      })

      describe('Argument-list processing', () => {
         it('#hasFlag checks for presence or absences of a flag', () => {
            const rawExpr = Parser.expressionOfString('foo --bar'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.hasFlag('bar')).toBe(true)
            expect(expr.hasFlag('widget')).toBe(false)
            expect(evl).not.toBeCalled()
         })

         it('#getPositionals returns an array of positional arguments evaluated into strings', () => {
            const rawExpr = Parser.expressionOfString('foo qux quux'),
               noop = jest.fn(() => '').mockName('noop'),
               expr = rawExpr.cloneWithEvaluatorSync(noop)

            const positionals = expr.getPositionals()
            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual(['qux', 'quux'])
         })

         it("#getPositionals doesn't invoke the evaluator without subexpressions", () => {
            const rawExpr = Parser.expressionOfString('foo qux quux'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.getPositionals()
            expect(evl).not.toBeCalled()
         })

         it('#getPositionals calls a provided evaluator with a subexpression', () => {
            const rawExpr = Parser.expressionOfString('foo (echo qux) quux'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.getPositionals()).toContainEqual('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEvalSync)
         })

         it('#getPositionals recursively reduces literals in subexpressions', () => {
            const rawExpr = Parser.expressionOfString('foo (echo qux) quux'),
               evl = jest.fn(subexpr => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.getPositionals()
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getPositionals()).toEqual(['qux'])
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#getPositionals recursively invokes the given evaluator', () => {
            const rawExpr = Parser.expressionOfString('foo (echo (echo qux)) quux'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.getPositionals()
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getPositionals()).toEqual(['fixed_result'])
            expect(evl).toHaveBeenCalledTimes(2)
         })

         it('#getFlag returns a string payload for a present, literal argument', () => {
            const rawExpr = Parser.expressionOfString('foo --bar=baz'),
               noop = jest.fn(() => '').mockName('noop'),
               expr = rawExpr.cloneWithEvaluatorSync(noop)

            const payload = expr.getFlag('bar')

            expect(typeof payload).toBe('string')
            expect(payload).toEqual('baz')
         })

         it("#getFlag doesn't invoke the evaluator without subexpressions", () => {
            const rawExpr = Parser.expressionOfString('foo --bar=baz'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.getFlag('bar')
            expect(evl).not.toBeCalled()
         })

         it('#getFlag calls a provided evaluator with a subexpression', () => {
            const rawExpr = Parser.expressionOfString('foo --bar=(echo baz)'),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.getFlag('bar')).toBe('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEvalSync)
         })

         it("#getFlag doesn't call the provided evaluator if the flag isn't preset", () => {
            const rawExpr = Parser.expressionOfString('foo --bar=(echo baz)'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expect(expr.getFlag('widget')).toBe(undefined)
            expect(evl).not.toBeCalled()
         })

         it('#getFlag recursively reduces literals in subexpressions', () => {
            const rawExpr = Parser.expressionOfString('foo --bar=(echo --qux=baz)'),
               evl = jest.fn(subexpr => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.getFlag('bar')
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getFlag('qux')).toBe('baz')
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#getFlag recursively invokes the given evaluator', () => {
            const rawExpr = Parser.expressionOfString(
                  'foo --bar=(echo --qux=(echo baz))',
               ),
               evl = jest.fn(subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluatorSync(evl)

            expr.getFlag('bar')
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            expect(arg.getFlag('qux')).toBe('fixed_result')
            expect(evl).toHaveBeenCalledTimes(2)
         })
      })
   }) // ExpressionEvalSync

   describe('ExpressionEval', () => {
      describe('Accessors (async)', () => {
         it('#command produces a string', () => {
            const rawExpr = Parser.expressionOfString('2test'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            return expect(expr.command).resolves.toBe('test')
         })

         it("#command doesn't invoke the evaluator without subexpressions", async () => {
            const rawExpr = Parser.expressionOfString('2test'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.command
            expect(evl).not.toBeCalled()
         })

         it('#command calls a provided evaluator with a subexpression', async () => {
            const rawExpr = Parser.expressionOfString('2(3echo actual_command)'),
               evl = jest.fn(async subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expect(expr.command).resolves.toBe('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEval)
            expect(arg.count).toBe(3)
         })

         it('#command recursively reduces literals in subexpressions', async () => {
            const rawExpr = Parser.expressionOfString('2(3echo actual_command)'),
               evl = jest.fn(async subexpr => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.command
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            await expect(arg.command).resolves.toBe('echo')
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#command recursively invokes the given evaluator', async () => {
            const rawExpr = Parser.expressionOfString('2(3(echo actual_command))'),
               evl = jest.fn(async subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.command
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            await expect(arg.command).resolves.toBe('fixed_result')
            expect(evl).toHaveBeenCalledTimes(2)
         })
      })

      describe('Argument-list processing (async)', () => {
         it('#hasFlag checks for presence or absences of a flag', () => {
            const rawExpr = Parser.expressionOfString('foo --bar'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            expect(expr.hasFlag('bar')).toBe(true)
            expect(expr.hasFlag('widget')).toBe(false)
            expect(evl).not.toBeCalled()
         })

         it('#getPositionals returns an array of positional arguments evaluated into strings', async () => {
            const rawExpr = Parser.expressionOfString('foo qux quux'),
               noop = jest.fn(async () => '').mockName('noop'),
               expr = rawExpr.cloneWithEvaluator(noop)

            const positionals = await expr.getPositionals()
            expect(positionals).toBeInstanceOf(Array)
            expect(positionals).toEqual(['qux', 'quux'])
         })

         it("#getPositionals doesn't invoke the evaluator without subexpressions", async () => {
            const rawExpr = Parser.expressionOfString('foo qux quux'),
               evl = jest.fn(async () => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.getPositionals()
            expect(evl).not.toBeCalled()
         })

         it('#getPositionals calls a provided evaluator with a subexpression', async () => {
            const rawExpr = Parser.expressionOfString('foo (echo qux) quux'),
               evl = jest.fn(async subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expect(expr.getPositionals()).resolves.toContainEqual('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEval)
         })

         it('#getPositionals recursively reduces literals in subexpressions', async () => {
            const rawExpr = Parser.expressionOfString('foo (echo qux) quux'),
               evl = jest.fn(async subexpr => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.getPositionals()
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            await expect(arg.getPositionals()).resolves.toEqual(['qux'])
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#getPositionals recursively invokes the given evaluator', async () => {
            const rawExpr = Parser.expressionOfString('foo (echo (echo qux)) quux'),
               evl = jest.fn(async subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.getPositionals()
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            await expect(arg.getPositionals()).resolves.toEqual(['fixed_result'])
            expect(evl).toHaveBeenCalledTimes(2)
         })

         it('#getFlag returns a string payload for a present, literal argument', async () => {
            const rawExpr = Parser.expressionOfString('foo --bar=baz'),
               noop = jest.fn(async () => '').mockName('noop'),
               expr = rawExpr.cloneWithEvaluator(noop)

            const payload = await expr.getFlag('bar')

            expect(typeof payload).toBe('string')
            expect(payload).toEqual('baz')
         })

         it("#getFlag doesn't invoke the evaluator without subexpressions", async () => {
            const rawExpr = Parser.expressionOfString('foo --bar=baz'),
               evl = jest.fn(async () => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.getFlag('bar')
            expect(evl).not.toBeCalled()
         })

         it('#getFlag calls a provided evaluator with a subexpression', async () => {
            const rawExpr = Parser.expressionOfString('foo --bar=(echo baz)'),
               evl = jest.fn(async subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expect(expr.getFlag('bar')).resolves.toBe('fixed_result')
            expect(evl).toHaveBeenCalled()

            const arg = evl.mock.calls[0][0]
            expect(arg).toBeInstanceOf(ExpressionEval)
         })

         it("#getFlag doesn't call the provided evaluator if the flag isn't preset", async () => {
            const rawExpr = Parser.expressionOfString('foo --bar=(echo baz)'),
               evl = jest.fn(() => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expect(expr.getFlag('widget')).resolves.toBe(undefined)
            expect(evl).not.toBeCalled()
         })

         it('#getFlag recursively reduces literals in subexpressions', async () => {
            const rawExpr = Parser.expressionOfString('foo --bar=(echo --qux=baz)'),
               evl = jest.fn(async subexpr => '').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.getFlag('bar')
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            await expect(arg.getFlag('qux')).resolves.toBe('baz')
            expect(evl).toHaveBeenCalledTimes(1)
         })

         it('#getFlag recursively invokes the given evaluator', async () => {
            const rawExpr = Parser.expressionOfString(
                  'foo --bar=(echo --qux=(echo baz))',
               ),
               evl = jest.fn(async subexpr => 'fixed_result').mockName('evl'),
               expr = rawExpr.cloneWithEvaluator(evl)

            await expr.getFlag('bar')
            expect(evl).toHaveBeenCalledTimes(1)

            const arg = evl.mock.calls[0][0]
            await expect(arg.getFlag('qux')).resolves.toBe('fixed_result')
            expect(evl).toHaveBeenCalledTimes(2)
         })
      })
   }) // ExpressionEval
})
