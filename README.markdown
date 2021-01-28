Excmd.js
========

**Work in progress:** Writing a replacement parser for [Tridactyl][]'s command-line and rcfiles, in
the spirit of Vi's command-line / Vimscript / ex.

Documentation: <https://excmd.js.org/>

Notable entry points to spelunking:
 - Complete JavaScript module index: <https://excmd.js.org/globals.html>
 - Complete OCaml module index: <https://excmd.js.org/excmd/Excmd/index.html>
 - A note on the resolution of ambiguous shellwords: <https://excmd.js.org/excmd/Excmd/Expression/index.html#reso>
 - Parsing entry-point functions: <https://excmd.js.org/excmd/Excmd/Parser/index.html#parsing-entry-points>

   [Tridactyl]: <https://github.com/cmcaine/tridactyl>
      "A Vim-like interface for Firefox, inspired by Vimperator/Pentadactyl."

Building & contributing
=======================
Under development. Probably.

For now (read: until I, or somebody else, publishes a packaged copy of Menhir to npm!), a local
OCaml development-environment, matching the version of BuckleScript's fork of OCaml, is required.

Here's a quick, up-to-date bootstrapping process for ~spring 2021:

    git clone https://github.com/ELLIOTTCABLE/excmd.js.git
    cd excmd.js

    sh <(curl -sL https://raw.githubusercontent.com/ocaml/opam/master/shell/install.sh)
    # (... or install opam using your platform's package-manager)

    opam switch create ./packages/bs-excmd --deps-only --locked --ignore-constraints-on=ocaml
    eval $(opam env --switch=./packages/bs-excmd --set-switch)

    # Finally, install JavaScript dependencies, BuckleScript, and kick off the initial build
    npm run bootstrap

Thereafter, when returning to the project, and before running `lerna run build` or any other OCaml-
dependant commands, you **have to** remember to run `eval $(opam env)` to add the OCaml binaries to
your shell's `$PATH`:

    # After i.e. `cd ~/Code/excmd.js`
    eval $(opam env --switch=./packages/bs-excmd --set-switch)

Finally, after all of the above, you can let Lerna kick off the rest of the build, orchestrated by
`bsb`, `tsc`, and Ninja, variously:

    lerna run build

### Directory structure
There are two packages comprising this project, to be published separately to npm:

 - [`packages/bs-excmd/`](packages/bs-excmd): the lexer and parser themselves; written in [OCaml][]
   using [Sedlex][] and [Menhir][], and compiled to JavaScript using the [ReScript][] compiler (née
   BuckleScript), published to npm as [`bs-excmd`][bs-excmd] ...

 - [`packages/excmd/`](packages/excmd): ... and a thin [TypeScript][] wrapper providing idiomatic
   JavaScript interfaces to the parser modules, published to npm as the primary package,
   [`excmd`][excmd].

[Lerna][], a JavaScript-ecosystem monorepo/multi-package management tool, orchestrates the building
of these two interdependent subpackages.

   [bs-excmd]: <https://www.npmjs.com/package/bs-excmd> "The core, generated parser library"
   [excmd]: <https://www.npmjs.com/package/bs-excmd> "The TypeScript interface-library for general
      consumption"
   [OCaml]: <https://ocaml.org/> "An elder, industrial-strength strongly-typed functional
      programming language"
   [Sedlex]: <https://github.com/ocaml-community/sedlex> "A Unicode-aware lexer-generator for OCaml
      projects"
   [Menhir]: <https://gitlab.inria.fr/fpottier/menhir> "An absurdly powerful LR(1) parser-generator
      for OCaml, akin to Yacc or Bison"
   [ReScript]: <https://rescript-lang.org/> "A fork of the OCaml compiler that produces readable
      JavaScript for the Node.js/npm ecosystem"
   [TypeScript]: <https://www.typescriptlang.org/> "A gradually-typed language that supersets plain
      JavaScript with type information"
   [Lerna]: <https://lerna.js.org/> "A monorepo management tool for the JavaScript ecosystem"

### Usage from OCaml
If you're hacking on this (or writing something other than JavaScript), it's useful to know that the
project has a hybrid build-system, and can be built from the OCaml side (via [Dune][]) *or* the
JavaScript side (via ReScript.)

Handily, Dune supports dynamically building an OCaml interactive toplevel with any/all OCaml modules
included:

    cd packages/bs-excmd/
    dune utop src

For my own expediency when iterating (sry not sry), the actual *parser* tests (as opposed to tests
for the JavaScript interface, the lexing, or the string-handling minutiae) are also written in
native OCaml, and evaluated by Dune:

    cd packages/bs-excmd/
    dune runtest

    # After making changes, and verifying that the output is as-expected,
    dune promote

Finally, the test-executable can interrogate arbitrary input, dumping the result in the same
JSON-format as the tests use:

    cd packages/bs-excmd/
    dune exec test/parser_test.exe expression "hello"
    dune exec test/parser_test.exe script "hello; there; friend"

   [Dune]: <https://dune.build/> "The OCaml-ecosystem build-orchestration tool"

### Debugging tips
 - To debug the parser, these [Menhir
   flags](http://gallium.inria.fr/~fpottier/menhir/manual.html#sec3) are particularly useful:
   `--log-automaton 1 --log-code 1 --log-grammar 1 --trace`. I've added those to an alternative
   `"generator"` in [`packages/bs-excmd/bsconfig.json`](packages/bs-excmd/bsconfig.json); simply
   swap the `"name": "menhir"` generator belonging to the `"parserAutomaton.ml"` edge with the
   `"menhir-with-logging"` one:

   ```diff
   --- i/packages/bs-excmd/bsconfig.json
   +++ w/packages/bs-excmd/bsconfig.json
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

   ... then re-build all libraries with `lerna run prepare`.

 - To debug OCaml implementation-code, it's useful to know that ReScript has a debugging mode that
   vastly improves the inspector output for data-structures. One thing those docs *do not* mention,
   however, is that you only need to add `[%%debugger.chrome]` to a single ML file in the current
   code-path — this is useful information when debugging a JavaScript interface like ours. (i.e. add
   the `[%%debugger.chrome]` expression to [`src/parser.ml`](src/parser.ml), even if you're
   debugging something like [`src/interface.ts`](src/interface.ts) that imports `parser.bs.js`.)

 - To debug OCaml implementation-code, it's useful to know that ReScript has a debugging mode that
   vastly improves the inspector output for data-structures. This can be enabled by passing `-bs-g`
   to `bsc`, most easily by adding it to the `"bsc-flags"` in `bsconfig.json`:

   ```diff
   --- i/packages/bs-excmd/bsconfig.json
   +++ w/packages/bs-excmd/bsconfig.json
   @@ -95,4 +95,5 @@
       "suffix": ".bs.js",
       "bsc-flags": [
   +      "-bs-g",
          "-bs-super-errors",
          "-bs-no-version-header",
   ```

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
