type 'a t
type script = AST.t

exception ParseError of Tokens.token Lexer.located

(** {1 Parsing entry-points } *)

val script : Lexer.buffer -> script
(** Invoke the Excmd parser with intent to consume, and produce, an entire Excmd-[script]. *)

val script_of_string : string -> script
(** Helper to invoke {!val:script} with a [string]. *)

val statement : Lexer.buffer -> Statement.t
(** Invoke the Excmd parser with intent to consume, and produce, a single Excmd {!Statement.t}. *)

val statement_of_string : string -> Statement.t
(** Helper to invoke {!val:statement} with a [string]. *)

(** {1 Menhir parser entry-points } *)

val script_automaton : AST.t t
(** Alias to {!val:ParserAutomaton.script}. *)

val statement_automaton : AST.statement t
(** Alias to {!val:ParserAutomaton.statement}. *)

(** {1 Menhir helpers } *)

val parse : Lexer.buffer -> 'a t -> 'a
(** A simple helper for Menhir-style parsers. Applies the given parser to the given lexbuf. *)

val parse_string : string -> 'a t -> 'a
(** A helper to apply the given Menhir-style parser to a string directly. *)
