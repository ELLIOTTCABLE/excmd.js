(* {2 Types } *)
type buffer

type token = Tokens.token * Lexing.position * Lexing.position
type 'a gen = unit -> 'a option

exception LexError of (Lexing.position * string)
exception ParseError of token

(* {2 Constructors } *)
val buffer_of_string : string -> buffer

(* {2 Accessors } *)
(* FIXME: Isn't there a better way to design this API inside BuckleScript? *)
val token : token -> Tokens.token
val compare_token : Tokens.token -> Tokens.token -> bool
val show_token : Tokens.token -> string
val token_body : Tokens.token -> string option

val start_lnum : token -> int
val start_cnum : token -> int
val end_lnum : token -> int
val end_cnum : token -> int

(* {2 Lexing functions } *)
val next_loc : buffer -> token
val next : buffer -> Tokens.token

val gen_loc : buffer -> token gen
val gen : buffer -> Tokens.token gen
