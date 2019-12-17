type buffer
(** {2 Types} *)

type position = Lexing.position =
   { pos_fname : string; pos_lnum : int; pos_bol : int; pos_cnum : int }
[@@deriving show]

type 'a located = 'a * position * position

type 'a gen = unit -> 'a option

exception LexError of position * string

val sedlex_of_buffer : buffer -> Sedlexing.lexbuf
(** {2 Constructors} *)

val buffer_of_sedlex : Sedlexing.lexbuf -> buffer

val buffer_of_string : string -> buffer

(* FIXME: Isn't there a better way to design this API inside BuckleScript? *)
val token : Tokens.token located -> Tokens.token
(** {2 Accessors} *)

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

val example_of_token : Tokens.token -> string option
(** [example_of_token tok] will provide an example string that, when consumed by the
    lexer (in, of course, an appropriate position), would produce the given token. e.g.
    [example_of_token FLAG_LONG] would produce ["--flag"].

    Notably, this *does not* produce a full, parseable input-fragment; simple an example
    of {e one} token. e.g. [example_of_token COMMENT] produces ["comment"], not
    ["/* comment */"]. *)

val token_is_erroneous : Tokens.token -> bool
(** [token_is_erroneous tok] indicates whether lexing should reasonably be expected to
    continue after reading [tok].

    This lexer will return tokens, instead of raising exceptions, for some common
    failure-states; this allows error-handling to be lifted into the parser, and more
    importantly, allows incremental recovery. In the parser itself, this is handled
    simply by not handling these erroneous tokens; if you're calling the lexer directly
    for any reason, you can use this function to ensure valid output. *)

val token_body : Tokens.token -> string option
(** [token_body tok] produces [Some string_payload] if the token carries a body-payload,
    and [None] if that type of token has no payload (or in the case of errors - see
    {!token_is_erroneous}.) e.g. [token_body (IDENTIFIER "hi")] yields ["hi"]. *)

val token_is_erroneous : Tokens.token -> bool
(** [token_is_erroneous tok] indicates whether lexing should reasonably be expected to
    continue after reading [tok].

    This lexer will return tokens, instead of raising exceptions, for some common
    failure-states; this allows error-handling to be lifted into the parser, and more
    importantly, allows incremental recovery. In the parser itself, this is handled
    simply by not handling these erroneous tokens; if you're calling the lexer directly
    for any reason, you can use this function to ensure valid output. *)

val token_error_message : Tokens.token -> string option
(** [token_error_message tok] produces [Some message] if the token represents a
    lexing-error (see {!token_is_erroneous}), and [None] for all non-erroneous tokens. *)

val start_lnum : Tokens.token located -> int

val start_cnum : Tokens.token located -> int

val end_lnum : Tokens.token located -> int

val end_cnum : Tokens.token located -> int

val error_loc_exn : exn -> position

val error_desc_exn : exn -> string

val position_fname : position -> string

val position_lnum : position -> int

val position_bol : position -> int

val position_cnum : position -> int

(** {2 Lexing functions} *)

val next_loc : buffer -> Tokens.token located

val next_loc_exn : buffer -> Tokens.token located

val next : buffer -> Tokens.token

val next_exn : buffer -> Tokens.token

val gen_loc : buffer -> Tokens.token located gen

val gen_loc_exn : buffer -> Tokens.token located gen

val gen : buffer -> Tokens.token gen

val gen_exn : buffer -> Tokens.token gen

val tokens_loc : buffer -> Tokens.token located array

val tokens_loc_exn : buffer -> Tokens.token located array

val tokens : buffer -> Tokens.token array

val tokens_exn : buffer -> Tokens.token array

val show_loctoken : Tokens.token located -> string
(** [show_loctoken tok] displays the internal OCaml representation of the located token
    [tok]. *)

val string_of_loctoken : Tokens.token located -> string
(** [string_of_loctoken tok] displays a simple, human-readable representation of the
    located token [tok]. *)

val string_of_position : position -> string
(** [string_of_position pos] displays a simple, human-readable representation of the
    individual position [pos]. *)
