(* {2 Types } *)
type buffer

type 'a located = 'a * Lexing.position * Lexing.position

type 'a gen = unit -> 'a option

exception LexError of Lexing.position * string

exception ParseError of Tokens.token located

(* {2 Constructors } *)
val sedlex_of_buffer : buffer -> Sedlexing.lexbuf

val buffer_of_sedlex : Sedlexing.lexbuf -> buffer

val buffer_of_string : string -> buffer

(* {2 Accessors } *)
(* FIXME: Isn't there a better way to design this API inside BuckleScript? *)
val token : Tokens.token located -> Tokens.token

val compare_token : Tokens.token -> Tokens.token -> bool

val show_token : Tokens.token -> string

val token_body : Tokens.token -> string option

val start_lnum : Tokens.token located -> int

val start_cnum : Tokens.token located -> int

val end_lnum : Tokens.token located -> int

val end_cnum : Tokens.token located -> int

(* {2 Lexing functions } *)
val next_loc : buffer -> Tokens.token located

val next : buffer -> Tokens.token

val gen_loc : buffer -> Tokens.token located gen

val gen : buffer -> Tokens.token gen

val tokens_loc : buffer -> Tokens.token located array

val tokens : buffer -> Tokens.token array
