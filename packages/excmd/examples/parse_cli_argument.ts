import {Parser} from '../dist/excmd.mjs'

let input = process.argv[2]
console.log('Parsing: "' + input + '"')
console.log('')

let expr = Parser.expressionOfString(input)
console.log('Parsing successful.')

console.log('Repetition count: ', expr.count)
console.log('Command name: ', expr.command)

if (expr.hasFlag('target')) {
   console.log('You included this --target: ', expr.getFlag('target'))
} else {
   console.log('You did not include a --target')
}

console.log('Finally, these positional-arguments were found:')
expr.getPositionals().forEach(arg => console.log(' - ' + arg))
