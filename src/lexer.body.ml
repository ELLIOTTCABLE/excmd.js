(* The rest of this file is appended to uAX31.ml, the output of the Unicode classifier in pkg/. *)

open Tokens
open Sedlexing

type mode = Main | BlockComment of int | String
type buffer = {
   sedlex: Sedlexing.lexbuf;
   mutable mode: mode
}

type token = Tokens.token * Lexing.position * Lexing.position
type 'a gen = unit -> 'a option

exception LexError of (Lexing.position * string)
exception ParseError of token

let sedlex_of_buffer buf = buf.sedlex
let buffer_of_sedlex sedlex = { sedlex = sedlex; mode = Main }


(* {2 Constructors } *)
let buffer_of_string str =
   buffer_of_sedlex (Sedlexing.Utf8.from_string str)

(* {2 Helpers } *)
let locate buf token =
   let start, curr = lexing_positions buf.sedlex in
   token, start, curr

let utf8 buf = Sedlexing.Utf8.lexeme buf.sedlex


(* {2 Accessors } *)
let token (tok : token) =
   let (tok, _loc, _end) = tok in
   tok

let start_lnum (tok : token) =
   let (_tok, loc, _end) = tok in
   loc.pos_lnum

let start_cnum (tok : token) =
   let (_tok, loc, _end) = tok in
   loc.pos_cnum - loc.pos_bol

let end_lnum (tok : token) =
   let (_tok, _start, loc) = tok in
   loc.pos_lnum

let end_cnum (tok : token) =
   let (_tok, _start, loc) = tok in
   loc.pos_cnum - loc.pos_bol

(* FIXME: I really need ppx_deriving or something to DRY this up. Sigh, bsb. *)
let show_token tok =
   match tok with
   | COLON -> "COLON"
   | PIPE -> "PIPE"
   | RIGHT_PAREN -> "RIGHT_PAREN"
   | RIGHT_COMMENT_DELIM -> "RIGHT_COMMENT_DELIM"
   | LEFT_PAREN -> "LEFT_PAREN"
   | LEFT_COMMENT_DELIM -> "LEFT_COMMENT_DELIM"
   | IDENTIFIER _ -> "IDENTIFIER"
   | SHORT_FLAGS _ -> "SHORT_FLAGS"
   | LONG_FLAG _ -> "LONG_FLAG"
   | EOF -> "EOF"
   | COMMENT_LINE _ -> "COMMENT_LINE"
   | COMMENT_CHUNK _ -> "COMMENT_CHUNK"

let compare_token a b =
   if a = b then true
   else match (a, b) with
   | (IDENTIFIER _, IDENTIFIER _)
   | (SHORT_FLAGS _, SHORT_FLAGS _)
   | (LONG_FLAG _, LONG_FLAG _)
   | (COMMENT_LINE _, COMMENT_LINE _)
   | (COMMENT_CHUNK _, COMMENT_CHUNK _) -> true
   | _ -> false

let token_body tok =
   match tok with
   | IDENTIFIER s
   | SHORT_FLAGS s
   | LONG_FLAG s
   | COMMENT_LINE s
   | COMMENT_CHUNK s -> Some s
   | _ -> None


(* {2 Errors } *)
let lexfail buf s =
   let _start, curr = lexing_positions buf.sedlex in
   raise (LexError (curr, s))

let illegal buf c =
   Uchar.to_int c
   |> Printf.sprintf "unexpected character in expression: 'U+%04X'"
   |> lexfail buf

let unreachable str =
   failwith (Printf.sprintf "Unreachable: %s" str)


(* {2 Regular expressions } *)
let newline_char =   [%sedlex.regexp? '\r' | '\n' ]
let newline =        [%sedlex.regexp? "\r\n" | newline_char ]

(* FIXME: Expand definition of whitespace to follow TR31 *)
let space_char =     [%sedlex.regexp? white_space ]
let space =          [%sedlex.regexp? Sub (space_char, newline_char) | newline ]

let digit =          [%sedlex.regexp? '0'..'9' ]

(* FIXME: Add U+200C/D? *)
let start_char =     [%sedlex.regexp? Sub (xid_start, digit) ]
let continue_char =  [%sedlex.regexp? xid_continue ]
let medial_char =    [%sedlex.regexp? Chars "-·." ]

(* UAX31-D1:
 *
 *     <Identifier> := <Start> <Continue>* (<Medial> <Continue>+)*
 *)
let identifier =     [%sedlex.regexp?
   start_char, Star continue_char,
   Star (medial_char, Plus continue_char)
]


(* {2 Lexer body } *)

(* Swallow and discard whitespace; produces no tokens. *)
let rec swallow_atmosphere buf =
   let s = buf.sedlex in
   match%sedlex s with
   | Plus space -> swallow_atmosphere buf
   | _ -> ()

(* Produces a single line of comment, wholesale, as a token. *)
and comment buf =
   let s = buf.sedlex in
   match%sedlex s with
   | Star (Compl (newline_char | eof)) ->
     COMMENT_LINE (utf8 buf) |> locate buf
   | _ -> unreachable "comment"

(* Wow. This is a monstrosity. *)
and block_comment depth buf =
   (* Js.log "token (mode: BlockComment)"; *)
   let s = buf.sedlex in
   match%sedlex s with
   | "*/" ->
     buf.mode <- (if depth = 1 then Main else BlockComment (depth - 1));
     RIGHT_COMMENT_DELIM |> locate buf

   | "/*" ->
     buf.mode <- BlockComment (depth + 1);
     LEFT_COMMENT_DELIM |> locate buf

   | '/', Compl '*'
   | '*', Compl '/'
   | Plus (Compl ('*' | '/')) ->
     let start, _ = sedlex_of_buffer buf |> Sedlexing.lexing_positions
     and acc = Buffer.create 256 (* 3 lines of 80 chars = ~240 bytes *) in
     Buffer.add_string acc (utf8 buf);
     continuing_block_comment buf start acc

   | eof -> lexfail buf "Reached end-of-file without finding a matching block-comment end-delimiter"
   | _ -> unreachable "block_comment"

and continuing_block_comment buf start acc =
   let s = buf.sedlex in
   let _, curr = Sedlexing.lexing_positions s in
   match%sedlex s with
   | "*/"
   | "/*" ->
     Sedlexing.rollback s;
     COMMENT_CHUNK (Buffer.contents acc), start, curr

   | '/', Compl '*'
   | '*', Compl '/'
   | Plus (Compl ('*' | '/')) ->
     Buffer.add_string acc (utf8 buf);
     continuing_block_comment buf start acc

   | eof -> lexfail buf "Reached end-of-file without finding a matching block-comment end-delimiter"
   | _ -> unreachable "continuing_block_comment"

and main buf =
   (* Js.log "token (mode: Main)"; *)
   swallow_atmosphere buf;
   let s = buf.sedlex in
   match%sedlex s with
   | eof -> EOF |> locate buf

   (* One-line comments are lexed as a single token ... *)
   | "//" -> comment buf

   (* ... while block-comments swap into a custom lexing-mode to handle proper nesting. *)
   | "/*" ->
     buf.mode <- BlockComment 1;
     LEFT_COMMENT_DELIM |> locate buf
   | "*/" -> lexfail buf "Unmatched block-comment end-delimiter"

   | identifier -> IDENTIFIER (utf8 buf) |> locate buf

   | ':' -> COLON |> locate buf
   | '|' -> PIPE |> locate buf

   | "--", identifier ->
      let whole = utf8 buf in
      let flag = String.sub whole 2 (String.length whole - 2) in
      LONG_FLAG flag |> locate buf

   | "-", identifier ->
      let whole = utf8 buf in
      let flags = String.sub whole 1 (String.length whole - 1) in
      SHORT_FLAGS flags |> locate buf

   | '(' -> LEFT_PAREN |> locate buf
   | ')' -> RIGHT_PAREN |> locate buf

   | _ ->
     match next buf.sedlex with
     | Some c -> illegal buf c
     | None -> unreachable "main"


(** Return the next token, with location information. *)
let next_loc buf =
   match buf.mode with
   | Main -> main buf
   | BlockComment depth -> block_comment depth buf
   | String -> failwith "NYI"


(** Return *just* the next token, discarding location information. *)
let next buf =
   let tok, _, _ = next_loc buf in tok

let gen_loc buf =
   fun () -> match next_loc buf with
      | EOF, _, _ -> None
      | _ as tuple -> Some tuple

let gen buf =
   fun () -> match next_loc buf with
      | EOF, _, _ -> None
      | tok, _, _ -> Some tok

let tokens_loc buf = gen_loc buf |> Gen.to_list
let tokens buf = gen buf |> Gen.to_list

let mode buf = buf.mode
