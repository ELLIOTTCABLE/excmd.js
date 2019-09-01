import termkit, {ScreenBuffer} from 'terminal-kit'

import Excmd from '../'

const term = termkit.terminal

// TODO: Document me!
function interrogate(startingValue: string) {
   let buffer = startingValue

   const start: Excmd.Checkpoint = Excmd.Parser.startStatementWithString(startingValue)
}

function goodbye(code?: number) {
   printNotice('Buh-bye 💖 !')
   term.processExit(typeof code === 'undefined' ? 0 : code)
}

// ### Ignore me, mundane terminal-setup noise follows.

function handleKeypress(buf: TextBuffer, key: string) {
   const keyDesc = '^y ' + key + ' '

   // In terminal-kit, `key` is always more than one codepoint in length if it's a special keypress.
   if (key.length === 1) {
      showNotice(keyDesc, false)

      buf.insert(key)
      buf.drawCursor()
      draw(buf, true)
   } else {
      switch (key) {
         // look ma, I'm implementing a text-editor in JavaScript. <.<
         case 'LEFT':
            showNotice(keyDesc, true)
            buf.moveBackward()
            buf.drawCursor()
            buf.dst.drawCursor()
            break

         case 'RIGHT':
            showNotice(keyDesc, true)
            buf.moveForward()
            buf.drawCursor()
            buf.dst.drawCursor()
            break

         case 'UP':
            showNotice(keyDesc, true)
            buf.moveUp()
            buf.moveInBound()
            buf.drawCursor()
            buf.dst.drawCursor()
            break

         case 'DOWN':
            showNotice(keyDesc, true)
            buf.moveDown()
            buf.moveInBound()
            buf.drawCursor()
            buf.dst.drawCursor()
            break

         case 'BACKSPACE':
            showNotice(keyDesc, false)
            buf.backDelete()
            buf.drawCursor()
            draw(buf, true)
            break

         case 'ENTER':
            showNotice(keyDesc, false)
            buf.newLine()
            buf.drawCursor()
            draw(buf, true)
            break

         case 'CTRL_C':
            showNotice(keyDesc, true)
            term.processExit(1)
            break

         default:
            throw new Error('Unhandled special key: ' + key)
      }
   }
}

// I'm using the "alternate screenbuffer" of the terminal; this ensures the user's command-line
// history isn't cluttered with repeated interactive output from this demo. It has some annoying
// side-effects, which I try to mitigate below ...
function setupAltMode() {
   // Setting up the terminal, swtiching to the alternate screenbuffer;
   term.fullscreen(true)
   term.grabInput(true)

   // Horrible hack to freeze the Node.js event-loop long enough for a user to see output;
   function sleep(seconds: number) {
      let msecs = seconds * 1000
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, msecs)
   }

   // Ensuring a clean exit, and a return to the users' expected terminal-state
   function onExit(code) {
      term.grabInput(false)
      sleep(2)
      term.fullscreen(false)
   }

   process.once('exit', onExit)
   process.once('SIGINT', onExit)
}

function moveToEnd(buf: TextBuffer) {
   const {width, height} = buf.getContentSize()
   buf.moveToLine(height - 1)
   buf.moveToEndOfLine()
}

// ### Aaaaaand off we go!

setupAltMode()

// Create a text-buffer to hold the user's input
const screen = new termkit.ScreenBuffer({dst: term})

const notice = new termkit.ScreenBuffer({dst: screen, y: term.height - 1, x: term.width})

let drawTimeout: NodeJS.Timeout = null
let drawPending = false
function draw(buf: TextBuffer | ScreenBuffer, immediate = false) {
   // First, go ahead and aggressively perform any virtual drawing to parent buffers:
   let next = buf
   do {
      next.draw()
      next = next.dst
   } while (next.dst instanceof termkit.ScreenBuffer)

   // If there's been a draw recently ...
   if (immediate === false && null !== drawTimeout) drawPending = true
   // ... else draw to the actual terminal, and schedule a check for the next draw.
   else {
      if (null !== drawTimeout) clearTimeout(drawTimeout)
      if (drawPending) drawPending = false

      next.draw()
      next.drawCursor()

      drawTimeout = setTimeout(function checkForScheduledDraw() {
         drawTimeout = null

         if (drawPending) {
            next.draw()
            next.drawCursor()

            drawPending = false
         }
      }, 500)
   }
}

let noticeTimeout: NodeJS.Timeout = null
function showNotice(str: string, drawNow = true) {
   if (noticeTimeout !== null) clearTimeout(noticeTimeout)

   // FIXME: This shouldn't be necessary; the below `put` at 0,0 should clear it, right? ...
   notice.fill({char: ' '})
   notice.draw()

   notice.x = term.width - termkit.stringWidth(str)
   notice.put({x: 0, y: 0, markup: true}, str)
   drawNow ? draw(notice) : notice.draw()

   noticeTimeout = setTimeout(function clearNotice() {
      notice.fill({char: ' '})
      draw(notice)

      noticeTimeout = null
   }, 1000)
}

const intro = new termkit.ScreenBuffer({dst: screen, y: term.height - 2})
intro.put(
   {},
   `Welcome! Edit the input above to see how it parses.
(↩  to watch the detailed, iterative process; ⌃ C to exit.)`,
)
intro.draw()

const input = new termkit.TextBuffer({
   dst: screen,
   height: 3,
   x: 3,
   y: term.height - 5,
})

input.setText(process.argv[2])
moveToEnd(input)
input.drawCursor()
draw(input)

term.on('key', handleKeypress.bind(null, input))
