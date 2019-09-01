import termkit from 'terminal-kit'

import Excmd from '../'

const term = termkit.terminal

// TODO: Document me!
function interrogate(startingValue) {
   let buffer = startingValue

   // Print our 'input' line
   term('Welcome! Edit the input below to see how it parses.\n')
   term('(↩  to watch the detailed, iterative process; ⌃ C to exit.)')
   term.moveTo(1, 4)
   term.bold('> ')

   term("Starting parsing with: '" + startingValue + "'")

   const start: Excmd.Checkpoint = Excmd.Parser.startStatementWithString(startingValue)

   term.inputField(
      {
         y: 4,
         x: 3,
         default: startingValue,
      },
      goodbye,
   )

   term.on('key', (key: string) => {
      if (key !== 'ENTER') printNotice('^#^m ' + key + ' ')
   })
   term.on('key', (key: string) => {
      if (key === 'CTRL_C') goodbye(1)
   })
}

function goodbye(code?: number) {
   printNotice('Buh-bye 💖 !')
   term.processExit(typeof code === 'undefined' ? 0 : code)
}

// ### Ignore me, mundane terminal-setup noise follows.

// lol horrible hack
let previousNoticeLength = 0
function printNotice(notice: string) {
   debugger
   const noticeLength = notice.length
   term.saveCursor()

   if (previousNoticeLength > noticeLength) {
      term.moveTo(term.width - previousNoticeLength)
      term.eraseLineAfter()
   }

   previousNoticeLength = noticeLength

   term.moveTo(term.width - noticeLength, 1)
   term(notice)

   term.restoreCursor()
}

// Setting up the terminal, swtiching to the alternate screenbuffer;
term.fullscreen(true)

// Horrible hack to freeze the Node.js event-loop long enough for a user to see output;
function sleep(seconds: number) {
   let msecs = seconds * 1000
   Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, msecs)
}

// Ensuring a clean exit, and a return to the users' expected terminal-state
function onExit() {
   sleep(2)
   term.fullscreen(false)
}

process.on('exit', onExit)
process.on('SIGINT', onExit)

let input = process.argv[2]
interrogate(input)
