type 'a t

type script = AST.t

exception ParseError of Tokens.token Lexer.located

(** {2 Accessors} *)

val error_loctoken_exn : exn -> Tokens.token Lexer.located

(** {2 Parsing entry-points} *)

val script : ?exn:bool -> Lexer.buffer -> script option
(** Invoke the Excmd parser with intent to consume, and produce, an entire Excmd-[script]. *)

val script_of_string : ?exn:bool -> string -> script option
(** Helper to invoke {!val:script} with a [string]. *)

val expression : ?exn:bool -> Lexer.buffer -> Expression.t option
(** Invoke the Excmd parser with intent to consume, and produce, a single Excmd
    {!Expression.t}. *)

val expression_of_string : ?exn:bool -> string -> Expression.t option
(** Helper to invoke {!val:expression} with a [string]. *)

(** {2 Menhir-generated parsing automata} *)

val script_automaton : AST.t t
(** Alias to {!val:ParserAutomaton.script}. *)

val expression_automaton : AST.expression t
(** Alias to {!val:ParserAutomaton.expression}. *)

(** {2 Helpers} *)

val parse : ?exn:bool -> Lexer.buffer -> 'a t -> 'a option
(** A simple helper for Menhir-style parsers. Applies the given parser to the given
    lexbuf. *)

val parse_string : ?exn:bool -> string -> 'a t -> 'a option
(** A helper to apply the given Menhir-style parser to a string directly. *)
