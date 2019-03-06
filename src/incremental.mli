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
