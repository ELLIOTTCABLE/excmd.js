type 'a checkpoint = private
   {status : 'a ParserAutomaton.MenhirInterpreter.checkpoint; buf : Lexer.buffer}

(** {2 Incremental entry-checkpoints } *)

val statement : Lexer.buffer -> AST.statement checkpoint
(** Start the incremental Excmd parser with intent to consume, and produce, a single
    Excmd {!Statement.t}. *)

val statement_of_string : string -> AST.statement checkpoint
(** Helper to invoke {!val:statement} with a [string]. *)

(** {2 Menhir incremental-parsing helpers } *)

val continue
   :  accept:('semantic -> 'result)
   -> fail:('semantic checkpoint -> 'semantic checkpoint -> 'result)
   -> 'semantic checkpoint
   -> 'result
(** A helper for Menhir's incremental parsers. Feeds the given ... NYD *)

(** {2 Introspection } *)

val acceptable_token : 'a checkpoint -> Tokens.token
(** [acceptable_token cp], given a [cp] that is in an {!InputNeeded} state, will return a
    single, arbitrarily chosen token that could be accepted by the parsing automaton. *)

val acceptable_tokens : 'a checkpoint -> Tokens.token array
(** [acceptable_tokens cp], given a [cp] that is in an {!InputNeeded} state, will return
    an array of example-tokens that *could* be accepted next by the parsing automaton. *)

val current_command : 'a checkpoint -> string option
(** [current_command cp] will, if the automaton has already accepted a IDENTIFIER token
    that will eventually become the [Statement.command] of the current statement, produce
    the name of that accepted command. If the parser is not in a state where a
    command-name has been accepted, then this will produce [None]. *)

val menhir_checkpoint_type : 'a checkpoint -> string

val terminal_or_nonterminal : 'a checkpoint -> string

val debug_checkpoint : 'a checkpoint -> unit
