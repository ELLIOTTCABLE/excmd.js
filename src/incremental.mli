type 'a checkpoint = private
   { status : 'a ParserAutomaton.MenhirInterpreter.checkpoint; buf : Lexer.buffer }

type element = ParserAutomaton.MenhirInterpreter.element

(** {2 Incremental entry-checkpoints} *)

val script : Lexer.buffer -> AST.t checkpoint
(** Start the incremental Excmd parser with intent to consume, and produce, a single
    Excmd {!Expression.t}. *)

val script_of_string : string -> AST.t checkpoint
(** Helper to invoke {!val:expression} with a [string]. *)

val expression : Lexer.buffer -> AST.expression checkpoint
(** Start the incremental Excmd parser with intent to consume, and produce, a single
    Excmd {!Expression.t}. *)

val expression_of_string : string -> AST.expression checkpoint
(** Helper to invoke {!val:expression} with a [string]. *)

(** {2 Incremental actions} *)

val continue
   :  accept:('semantic -> 'result)
   -> fail:('semantic checkpoint -> 'semantic checkpoint -> 'result)
   -> 'semantic checkpoint
   -> 'result
(** A helper for Menhir's incremental parsers. Feeds the given ... NYD *)

(** {2 High-level introspection helpers}

    This set of functions are simply wrappers around Menhir's mechanics, to provide quick
    access to a few derived values. Although one can easily implement additional
    introspective tools in the same fashion, it's worth noting that any such helpers are
    going to be tightly coupled to the specifics of the grammar; and such, it's probably a
    good idea to keep them centrally located ... right here!

    tl;dr upstream your usage, so I can excercise and standardize it, plz. *)

val acceptable_token : 'a checkpoint -> Tokens.token
(** [acceptable_token cp], given a [cp] that is in an {!InputNeeded} state, will return a
    single, arbitrarily chosen token that could be accepted by the parsing automaton.

    JavaScript interface: [Checkpoint::acceptable_token]. *)

val acceptable_tokens : 'a checkpoint -> Tokens.token array
(** [acceptable_tokens cp], given a [cp] that is in an {!InputNeeded} state, will return
    an array of example-tokens that {e could} be accepted next by the parsing automaton.

    JavaScript interface: [Checkpoint::acceptable_tokens]. *)

val current_command : 'a checkpoint -> string AST.or_subexpr option
(** [current_command cp] will, if the automaton has already accepted a token that will
    eventually become the [Expression.command] of the current expression, produce the name
    of that accepted command. If the parser is not in a state where a command-name has
    been accepted, then this will produce [None].

    JavaScript interface: [Checkpoint::command]. *)

(** {2 Low-level introspection}

    The rest of these mostly exist to unwrap and name types for the use of the JavaScript
    interface; and are a pain to maintain. I really need automated generative tooling for
    variant-to-string converters ... *)

val automaton_status_str : 'a checkpoint -> string
(** [automaton_status_str cp] will return the current
    {{:http://gallium.inria.fr/~fpottier/menhir/manual.html#sec59} Menhir
    checkpoint-status} for the provided [cp]; this will be a string like ["InputNeeded"],
    ["Accepted"], and so on.

    This is primarily for debugging, and generation of the appropriate JavaScript symbols
    for interop. You should, of course, do actual pattern-matching on the actual
    variant-type, if working from within OCaml.

    JavaScript interface: [Checkpoint::automaton_status]. *)

val element_incoming_symbol_category_str : element -> string

val incoming_symbol_category_str : 'a checkpoint -> string option
(** [incoming_symbol_category_str cp] returns a string indicating whether the current
    symbol (the top of the automaton's stack) is a ["terminal"] or ["nonterminal"] symbol.
    If the stack is empty, this will produce [None].

    This will raise an exception if called on [Accepted] or [Rejected] checkpoints.

    JavaScript interface: [Checkpoint::incoming_symbol_category]. *)

val element_incoming_symbol_type_str : element -> string

val incoming_symbol_type_str : 'a checkpoint -> string option
(** [incoming_symbol_type_str cp] returns a string describing the OCaml runtime type of
    the semantic values associated with the current symbol (that on top of the automaton's
    stack). If the stack is empty, this will produce [None].

    This will raise an exception if called on [Accepted] or [Rejected] checkpoints.

    JavaScript interface: [Checkpoint::incoming_symbol_type]. *)

val element_incoming_symbol_str : element -> string

val incoming_symbol_str : 'a checkpoint -> string option
(** [incoming_symbol_str cp] returns a string describing the current symbol (that on top
    of the automaton's stack); e.g. ["unterminated_expression"] or ["EQUALS"]. If the
    stack is empty, this will produce [None].

    This will raise an exception if called on [Accepted] or [Rejected] checkpoints.

    JavaScript interface: [Checkpoint::incoming_symbol]. *)

val get_before : 'a checkpoint -> int -> element option

val get_after : 'a checkpoint -> int -> element option

val debug_checkpoint : 'a checkpoint -> unit
