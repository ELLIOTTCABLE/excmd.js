type buffer
(** {2 Types } *)

type position = Lexing.position =
   { pos_fname : string; pos_lnum : int; pos_bol : int; pos_cnum : int }
[@@deriving show]

type 'a located = 'a * position * position

type 'a gen = unit -> 'a option

exception LexError of position * string

val sedlex_of_buffer : buffer -> Sedlexing.lexbuf
(** {2 Constructors } *)

val buffer_of_sedlex : Sedlexing.lexbuf -> buffer

val buffer_of_string : string -> buffer

(* FIXME: Isn't there a better way to design this API inside BuckleScript? *)
val token : Tokens.token located -> Tokens.token
(** {2 Accessors } *)

val example_tokens : Tokens.token array
(** A static list of all tokens available at runtime, with arbitrary (but legal) payloads
    when appropriate.

    (Necessary for the incremental parser.) *)

val compare_token : Tokens.token -> Tokens.token -> bool

val show_token : Tokens.token -> string
(** [show_token tok] will provide an arbitrary, unique string-representation of that
    token, useful for debugging purposes. e.g. [show_token SEMICOLON] would return
    ["SEMICOLON"].

    For a more human-friendly version, see {!example_of_token}. *)

val example_of_token : Tokens.token -> string

val token_body : Tokens.token -> string option

val start_lnum : Tokens.token located -> int

val start_cnum : Tokens.token located -> int

val end_lnum : Tokens.token located -> int

val end_cnum : Tokens.token located -> int

val error_loc_exn : exn -> position

val error_desc_exn : exn -> string

(** {2 Lexing functions } *)

val next_loc : buffer -> Tokens.token located

val next : buffer -> Tokens.token

val gen_loc : buffer -> Tokens.token located gen

val gen : buffer -> Tokens.token gen

val tokens_loc : buffer -> Tokens.token located array

val tokens : buffer -> Tokens.token array

val show_loctoken : Tokens.token located -> string
(** [show_loctoken tok] displays the internal OCaml representation of the located token
    [tok]. *)

val string_of_loctoken : Tokens.token located -> string
(** [string_of_loctoken tok] displays a simple, human-readable representation of the
    located token [tok]. *)

val string_of_position : position -> string
(** [string_of_position pos] displays a simple, human-readable representation of the
    individual position [pos]. *)
