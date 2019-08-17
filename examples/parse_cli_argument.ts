import {Parser} from '../'

let input = process.argv[2]
console.log('Parsing: "' + input + '"')
console.log('')

let stmt = Parser.statementOfString(input)
console.log('Parsing successful.')

console.log('Repetition count: ', stmt.count)
console.log('Command name: ', stmt.command)

if (stmt.hasFlag('target')) {
   console.log('You included this --target: ', stmt.getFlag('target'))
} else {
   console.log('You did not include a --target')
}

console.log('Finally, these positional-arguments were found:')
stmt.getPositionals().forEach(arg => console.log(' - ' + arg))
