type 'a checkpoint = private
   { status : 'a ParserAutomaton.MenhirInterpreter.checkpoint; buf : Lexer.buffer }

(** {2 Incremental entry-checkpoints} *)

val script : Lexer.buffer -> AST.t checkpoint
(** Start the incremental Excmd parser with intent to consume, and produce, a single
    Excmd {!Statement.t}. *)

val script_of_string : string -> AST.t checkpoint
(** Helper to invoke {!val:statement} with a [string]. *)

val statement : Lexer.buffer -> AST.statement checkpoint
(** Start the incremental Excmd parser with intent to consume, and produce, a single
    Excmd {!Statement.t}. *)

val statement_of_string : string -> AST.statement checkpoint
(** Helper to invoke {!val:statement} with a [string]. *)

(** {2 Menhir incremental-parsing helpers} *)

val continue
   :  accept:('semantic -> 'result)
   -> fail:('semantic checkpoint -> 'semantic checkpoint -> 'result)
   -> 'semantic checkpoint
   -> 'result
(** A helper for Menhir's incremental parsers. Feeds the given ... NYD *)

(** {2 Introspection} *)

val acceptable_token : 'a checkpoint -> Tokens.token
(** [acceptable_token cp], given a [cp] that is in an {!InputNeeded} state, will return a
    single, arbitrarily chosen token that could be accepted by the parsing automaton.

    JavaScript interface: [Checkpoint::acceptable_token]. *)

val acceptable_tokens : 'a checkpoint -> Tokens.token array
(** [acceptable_tokens cp], given a [cp] that is in an {!InputNeeded} state, will return
    an array of example-tokens that {e could} be accepted next by the parsing automaton.

    JavaScript interface: [Checkpoint::acceptable_tokens]. *)

val current_command : 'a checkpoint -> string option
(** [current_command cp] will, if the automaton has already accepted a IDENTIFIER token
    that will eventually become the [Statement.command] of the current statement, produce
    the name of that accepted command. If the parser is not in a state where a
    command-name has been accepted, then this will produce [None].

    JavaScript interface: [Checkpoint::command]. *)

val automaton_status_str : 'a checkpoint -> string
(** [automaton_status_str cp] will return the current
    {{:http://gallium.inria.fr/~fpottier/menhir/manual.html#sec59} Menhir
    checkpoint-status} for the provided [cp]; this will be a string like ["InputNeeded"],
    ["Accepted"], and so on.

    This is primarily for debugging, and generation of the appropriate JavaScript symbols
    for interop. You should, of course, do actual pattern-matching on the actual
    variant-type, if working from within OCaml.

    JavaScript interface: [Checkpoint::automaton_status]. *)

val incoming_symbol_category_str : 'a checkpoint -> string option
(** [incoming_symbol_category_str cp] returns a string indicating whether the current symbol
    (the top of the automaton's stack) is a ["terminal"] or ["nonterminal"] symbol. If the
    stack is empty, this will produce [None].

    This will raise an exception if called on [Accepted] or [Rejected] checkpoints.

    JavaScript interface: [Checkpoint::incoming_symbol_category]. *)

val incoming_symbol_type_str : 'a checkpoint -> string option
(** [incoming_symbol_type_str cp] returns a string describing the OCaml runtime type of the semantic values associated with the current symbol (that on top of the automaton's stack). If the stack is empty, this will produce [None].

    This will raise an exception if called on [Accepted] or [Rejected] checkpoints.

    JavaScript interface: [Checkpoint::incoming_symbol_type]. *)

val incoming_symbol_str : 'a checkpoint -> string option
(** [incoming_symbol_str cp] returns a string describing the current symbol (that on top of the automaton's stack); e.g. ["unterminated_statement"] or ["EQUALS"]. If the stack is empty, this will produce [None].

    This will raise an exception if called on [Accepted] or [Rejected] checkpoints.

    JavaScript interface: [Checkpoint::incoming_symbol]. *)


val debug_checkpoint : 'a checkpoint -> unit
