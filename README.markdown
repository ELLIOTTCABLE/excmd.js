`excmd-parser`
==============

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

    # After i.e. `cd ~/Code/excmd-parser`
    eval $(opam env --switch=. --set-switch)

Finally, after all of the above, you can let Ninja handle most of the build, orchestrated by `bsb`.
For further incremental builds, while hacking, you can simply invoke that with:

    npm run build

But the first time you clone the repository, you may need to ...

### Build the Unicode-category regexen
Some of the lexer is *generated* from Unicode categories. You may have to download the Unicode
Character Database before your first build, and generate the UAX31 regexen. (These should already be
committed to the repo, and shouldn't change except with major Unicode versions.) Nonetheless, if you
need to rebuild them:

    make

## Usage from OCaml
If you're hacking on this (or writing something other than JavaScript), it's useful to know that the
project has a hybrid build-system, and can be built from the OCaml side (via Dune) *or* the
JavaScript side (via BuckleScript.)

Handily, Dune supports dynamically building an OCaml interactive toplevel with any/all OCaml modules
included:

    dune utop src

Notes:
======
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
