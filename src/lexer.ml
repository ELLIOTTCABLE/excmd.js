open Tokens
open Sedlexing

type mode = Main | BlockComment of int | String
type buffer = {
   sedlex: Sedlexing.lexbuf;
   mutable mode: mode
}

type token = Tokens.token * Lexing.position * Lexing.position
type gen = unit -> token option

exception LexError of (Lexing.position * string) [@@deriving sexp]
exception ParseError of token [@@deriving sexp]

let sedlex_of_buffer buf = buf.sedlex
let buffer_of_sedlex sedlex = { sedlex = sedlex; mode = Main }


(* ### Helpers *)
let locate buf token =
   let start, curr = lexing_positions buf.sedlex in
   token, start, curr

let utf8 buf = Sedlexing.Utf8.lexeme buf.sedlex


(* ### Errors *)
let lexfail buf s =
   let _start, curr = lexing_positions buf.sedlex in
   raise (LexError (curr, s))

let illegal buf c =
   Uchar.to_int c
   |> Printf.sprintf "unexpected character in expression: 'U+%04X'"
   |> lexfail buf

let unreachable str =
   failwith (Printf.sprintf "Unreachable: %s" str)


(* ### Regular expressions *)
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

let pipe =           [%sedlex.regexp? '|' ]


(* ### Lexer body *)

(* Swallow and discard whitespace; produces no tokens. *)
let rec swallow_atmosphere buf =
   let s = buf.sedlex in
   match%sedlex s with
   | Plus space -> swallow_atmosphere buf
   | _ -> ()

(* Produces a single line of comment, wholesale, as a token. *)
let rec comment buf =
   let s = buf.sedlex in
   match%sedlex s with
   | eof -> EOF |> locate buf
   | Star (Compl newline_char) ->
     COMMENT_LINE (utf8 buf) |> locate buf
   | _ -> unreachable "comment"

(* Wow. This is a monstrosity. *)
and block_comment depth buf =
   Js.log "token (mode: BlockComment)";
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
   Js.log "token (mode: Main)";
   swallow_atmosphere buf;
   let s = buf.sedlex in
   match%sedlex s with
   | eof -> EOF |> locate buf

   (* One-line comments are lexed as a single token ... *)
   | ';' -> comment buf

   (* ... while block-comments swap into a custom lexing-mode to handle proper nesting. *)
   | "/*" ->
     buf.mode <- BlockComment 1;
     LEFT_COMMENT_DELIM |> locate buf
   | "*/" -> lexfail buf "Unmatched block-comment end-delimiter"

   | identifier -> IDENTIFIER (utf8 buf) |> locate buf

   | '(' -> LEFT_PAREN |> locate buf
   | ')' -> RIGHT_PAREN |> locate buf

   | _ ->
     match next buf.sedlex with
     | Some c -> illegal buf c
     | None -> unreachable "main"


(** Return the next token, with location information. *)
let token_loc buf =
   match buf.mode with
   | Main -> main buf
   | BlockComment depth -> block_comment depth buf
   | String -> failwith "NYI"


(** Return *just* the next token, discarding location information. *)
let token buf =
   let tok, _, _ = token_loc buf in tok

let gen_loc buf =
   fun () -> match token_loc buf with
      | EOF, _, _ -> None
      | _ as tuple -> Some tuple

let gen buf =
   fun () -> match token_loc buf with
      | EOF, _, _ -> None
      | tok, _, _ -> Some tok

let tokens_loc buf = gen_loc buf |> Gen.to_list
let tokens buf = gen buf |> Gen.to_list

let mode buf = buf.mode
