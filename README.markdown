Excmd.js
========

**Work in progress:** Writing a replacement parser for [Tridactyl][]'s command-line and rcfiles, in
the spirit of Vi's command-line / Vimscript / ex.

   [Tridactyl]: <https://github.com/cmcaine/tridactyl>
      "A Vim-like interface for Firefox, inspired by Vimperator/Pentadactyl."

Building
========
Under development. Probably.

For now (read: until I, or somebody else, publishes a packaged copy of Menhir to npm!), a local
OCaml development-environment, matching the version of BuckleScript's fork of OCaml, is required.

Here's a quick, up-to-date bootstrapping process for ~fall 2018:

    sh <(curl -sL https://raw.githubusercontent.com/ocaml/opam/master/shell/install.sh)
    opam switch create ./ --deps-only --locked --ignore-constraints-on=ocaml

    # Finally, install JavaScript dependencies, BuckleScript, and kick off the initial build
    npm install

Thereafter, when returning to the project, and before running `npm run build` or any other OCaml-
dependant commands, you have to remember to run:

    # After i.e. `cd ~/Code/excmd`
    eval $(opam env --switch=. --set-switch)

Finally, after all of the above, you can let Ninja handle most of the build, orchestrated by `bsb`.
For further incremental builds, while hacking, you can simply invoke that with:

    npm run build

But the first time you clone the repository, you may need to ...

#### Build the Unicode-category regexen
Some of the lexer is *generated* from Unicode categories. You may have to download the Unicode
Character Database before your first build, and generate the UAX31 regexen. (These should already be
committed to the repo, and shouldn't change except with major Unicode versions.) Nonetheless, if you
need to rebuild them:

    make

### Usage from OCaml
If you're hacking on this (or writing something other than JavaScript), it's useful to know that the
project has a hybrid build-system, and can be built from the OCaml side (via Dune) *or* the
JavaScript side (via BuckleScript.)

Handily, Dune supports dynamically building an OCaml interactive toplevel with any/all OCaml modules
included:

    dune utop src

For my own expediency when iterating (sry not sry), the actual *parser* tests (as opposed to tests
for the JavaScript interface, the lexing, or the string-handling minutiae) are also written in
native OCaml, and evaluated by Dune:

    dune runtest
    # After making changes, and verifying that the output is as-expected,
    dune promote

Finally, the test-executable can interrogate arbitrary input, dumping the result in the same
JSON-format as the tests use:

    dune exec test/parser_test.exe expression "hello"
    dune exec test/parser_test.exe script "hello; there; friend"

Notes:
======

### Debugging tips
To debug the parser, these [Menhir flags](http://gallium.inria.fr/~fpottier/menhir/manual.html#sec3)
are particularly useful: `--log-automaton 1 --log-code 1 --log-grammar 1 --trace`. I've added those
to an alternative `"generator"` in `bsconfig.json`; simply swap the `"name": "menhir"` generator
belonging to the `"parserAutomaton.ml"` edge with the `"menhir-with-logging"` one:

```diff
--- i/bsconfig.json
+++ w/bsconfig.json
@@ -9,7 +9,7 @@
          { "name": "prepend-uax31", "edge": ["lexer.ml", ":", "uAX31.ml", "lexer.body.ml"] },
          { "name": "menhir-tokens", "edge": ["tokens.ml", "tokens.mli", ":", "parserAutomaton.mly", "tokens.tail.ml", "tokens.tail.mli"] },
          { "name": "menhir-lib", "edge": ["menhirLib.ml", "menhirLib.mli", ":", "parserAutomaton.mly"] },
-         { "name": "menhir", "edge": ["parserAutomaton.ml", ":", "parserAutomaton.mly", "parserUtils.mly", "tokens.ml"] }
+         { "name": "menhir-with-logging", "edge": ["parserAutomaton.ml", ":", "parserAutomaton.mly", "parserUtils.mly", "tokens.ml"] }
       ]
     }
   ],
```

... then re-build your code with `npm run prepare`.

To debug OCaml implementation-code, it's useful to know that BuckleScript has a [debugging mode][]
that vastly improves the inspector output for data-structures. One thing those docs *do not*
mention, however, is that you only need to add `[%%debugger.chrome]` to a single ML file in the
current code-path — this is useful information when debugging a JavaScript interface like ours.
(i.e. add the `[%%debugger.chrome]` expression to `Parser.ml`, even if you're debugging
`interface.js` that includes `Parser.bs.js`.)

   [debugging mode]: <https://bucklescript.github.io/docs/en/better-data-structures-printing-debug-mode.html>
      "BuckleScript's documentation for enabling debugging symbols in the compiler"


### Internationalization concerns w.r.t. lexing
I'm going to be broadly following Unicode 11's [UAX #31 “Unicode Identifier And Pattern
Syntax”][UAX31]; speaking formally, this implementation is planned to conform to requirements ...

1. [R1][], Default Identifiers: Identifiers begin with `XID_Start`, continue with `XID_Continue +=
   [U+200C-U+200D]` (subject to the restrictions below), allowing for medial (non-repeated,
   non-terminating) instances of the following characters:

    - `U+002D`: `-` HYPHEN-MINUS,
    - `U+002E`: `.` FULL STOP,
    - `U+00B7`: `·` MIDDLE DOT,

   ... and excluding characters belonging to a script listed in “Candidate Characters for Exclusion
   from Identifiers” (UAX 31, Table 4).

2. [R1a][], Restricted Format Characters: `U+200C` & `D`, that is, the zero-width non-joiners,
   shall only be parsed in a context necessary to handling the appropriate Farsi, Malayalam, etc.
   phrases: when breaking a cursive connection (context [A1][]), and in a conjunct (context [B][].)
   (**NYI!**)

3. [R3][], `Pattern_White_Space` and `Pattern_Syntax` Characters: Arguments and flags (unique to
   Tridactyl, and not occurring in the original Vimscript) are separated with whitespace, which is
   exactly the Unicode `Pattern_White_Space` category.

4. [R4][], Equivalent Normalized Identifiers: The parser yields both display-form (what you typed)
   and normalized-form (what you meant) output. Where possible, your input should be displayed
   as-typed; but should be utilized as normalized before comparisons and references.

   [UAX31]: <http://unicode.org/reports/tr31/>
   [R1]: <http://unicode.org/reports/tr31/#R1>
   [R1a]: <http://unicode.org/reports/tr31/#R1a>
   [A1]: <http://unicode.org/reports/tr31/#A1>
   [B]: <http://unicode.org/reports/tr31/#B>
   [R3]: <http://unicode.org/reports/tr31/#R3>
   [R4]: <http://unicode.org/reports/tr31/#R4>
