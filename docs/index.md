This is a library for parsing [Tridactyl][]-style ‘ex-mode commands.’ These lie somewhere halfway
between a [Vim excmd][] and a POSIX-sh command.

<!-- FIXME: use actual, functioning commands, once this starts to ship into Tridactyl -->

```viml
" I like wikiwand but I don't like the way it changes URLs
bindurl wikiwand.com yy composite js document.location.href.replace("wikiwand.com/en","wikipedia.org/wiki") | clipboard yank

" Make gu take you back to subreddit from comments
bindurl reddit.com gu urlparent 4

" Allow Ctrl-a to select all in the commandline
unbind --mode=ex <C-a>

" Julia docs' built in search is bad
set searchurls.julia https://www.google.com/search?q=site:http://docs.julialang.org/en/v1.0%20
```

Jump to:

 - [JavaScript module index](./globals.html)
 - [OCaml module index](./excmd/Excmd/index.html)

   [Tridactyl]: <https://github.com/tridactyl/tridactyl> "Tridactyl, the vi-mode for FireFox"
   [Vim excmd]: <http://learnvimscriptthehardway.stevelosh.com/chapters/01.html>
      "Steve Losh's documentation on Vim's original ex-mode commands"

Usage
=====

Get started with [[Parser.expressionOfString]].

DOCME!
