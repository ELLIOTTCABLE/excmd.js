(* This file is appended to uAX31.ml, the output of the Unicode classifier in pkg/. *)

open Tokens
open Sedlexing

type mode = Main | Immediate | BlockComment of int | String

type buffer = {sedlex : Sedlexing.lexbuf; mutable mode : mode}

type 'a located = 'a * Lexing.position * Lexing.position

type 'a gen = unit -> 'a option

exception LexError of Lexing.position * string

exception ParseError of token located

let sedlex_of_buffer buf = buf.sedlex

let buffer_of_sedlex sedlex = {sedlex; mode = Main}

(* {2 Constructors } *)
let buffer_of_string str = buffer_of_sedlex (Sedlexing.Utf8.from_string str)

(* {2 Helpers } *)
let locate buf tok =
   let start, curr = lexing_positions buf.sedlex in
   (tok, start, curr)


let utf8 buf = Sedlexing.Utf8.lexeme buf.sedlex

(* {2 Accessors } *)
let token (tok : token located) =
   let tok, _loc, _end = tok in
   tok


let start_lnum (tok : token located) =
   let _tok, loc, _end = tok in
   loc.pos_lnum


let start_cnum (tok : token located) =
   let _tok, loc, _end = tok in
   loc.pos_cnum - loc.pos_bol


let end_lnum (tok : token located) =
   let _tok, _start, loc = tok in
   loc.pos_lnum


let end_cnum (tok : token located) =
   let _tok, _start, loc = tok in
   loc.pos_cnum - loc.pos_bol


(* FIXME: I really need ppx_deriving or something to DRY all this mess up. Sigh, bsb. *)
let example_tokens =
   [| COLON
    ; PIPE
    ; EQUALS
    ; SEMICOLON
    ; COUNT "123"
    ; RIGHT_PAREN
    ; RIGHT_COMMENT_DELIM
    ; LEFT_PAREN
    ; LEFT_COMMENT_DELIM
    ; IDENTIFIER "ARBITRARY"
    ; SHORT_FLAGS "ABC"
    ; LONG_FLAG "ARBITRARY"
    ; EOF
    ; COMMENT_LINE "ARBITRARY"
    ; COMMENT_CHUNK "ARBITRARY" |]


let show_token tok =
   match tok with
   | COLON -> "COLON"
   | PIPE -> "PIPE"
   | EQUALS -> "EQUALS"
   | SEMICOLON -> "SEMICOLON"
   | COUNT _ -> "COUNT"
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


let example_of_token tok =
   match tok with
   | COLON -> ":"
   | PIPE -> "|"
   | EQUALS -> "="
   | SEMICOLON -> ";"
   | COUNT _ -> "2"
   | RIGHT_PAREN -> ")"
   | RIGHT_COMMENT_DELIM -> "*/"
   | LEFT_PAREN -> "("
   | LEFT_COMMENT_DELIM -> "/*"
   | IDENTIFIER str -> str
   | SHORT_FLAGS flags -> "-" ^ flags
   | LONG_FLAG flag -> "--" ^ flag
   | EOF -> ""
   | COMMENT_LINE _ -> "// comment"
   | COMMENT_CHUNK _ -> "comment body"


let compare_token a b =
   if a = b then true
   else
   match (a, b) with
   | COUNT _, COUNT _
   |IDENTIFIER _, IDENTIFIER _
   |SHORT_FLAGS _, SHORT_FLAGS _
   |LONG_FLAG _, LONG_FLAG _
   |COMMENT_LINE _, COMMENT_LINE _
   |COMMENT_CHUNK _, COMMENT_CHUNK _ ->
      true
   | _ -> false


let token_body tok =
   match tok with
   | COUNT s
   |IDENTIFIER s
   |SHORT_FLAGS s
   |LONG_FLAG s
   |COMMENT_LINE s
   |COMMENT_CHUNK s ->
      Some s
   | _ -> None


(* {2 Errors } *)
let lexfail buf s =
   let _start, curr = lexing_positions buf.sedlex in
   raise (LexError (curr, s))


let illegal buf c =
   Uchar.to_int c
   |> Printf.sprintf "unexpected character in expression: 'U+%04X'"
   |> lexfail buf


let unreachable str = failwith (Printf.sprintf "Unreachable: %s" str)

(* {2 Regular expressions } *)
let newline_char = [%sedlex.regexp? '\r' | '\n']

let newline = [%sedlex.regexp? "\r\n" | newline_char]

(* FIXME: Expand definition of whitespace to follow TR31 *)
let space_char = [%sedlex.regexp? white_space]

let space = [%sedlex.regexp? Sub (space_char, newline_char) | newline]

let zero = [%sedlex.regexp? '0']

let nonzero = [%sedlex.regexp? '1' .. '9']

let digit = [%sedlex.regexp? zero | nonzero]

let count = [%sedlex.regexp? zero | nonzero, Star digit]

(* FIXME: Add U+200C/D? *)
let start_char = [%sedlex.regexp? Sub (xid_start, digit)]

let continue_char = [%sedlex.regexp? xid_continue]

let medial_char =
   [%sedlex.regexp?
         ( 0x002D (* '-' HYPHEN-MINUS *) | 0x002E (* '.' FULL STOP *)
         | 0x00B7
         (* '·' MIDDLE DOT *)  | 0x058A (* '֊' ARMENIAN HYPHEN *)
         | 0x05F4
         (* '״' HEBREW PUNCTUATION GERSHAYIM *)
         | 0x0F0B
         (* '་' TIBETAN MARK INTERSYLLABIC TSHEG *)  | 0x2027 (* '‧' HYPHENATION POINT *)
         | 0x30FB (* '・' KATAKANA MIDDLE DOT *) )]


(* UAX31-D1:
 *
 *     <Identifier> := <Start> <Continue>* (<Medial> <Continue>+)*
*)
let identifier =
   [%sedlex.regexp?
         start_char, Star continue_char, Star (medial_char, Plus continue_char)]


(* {2 Lexer body } *)

(* Swallow and discard whitespace; produces no tokens. *)
let rec swallow_atmosphere ?(saw_whitespace = false) buf =
   let s = buf.sedlex in
   match%sedlex s with
   | Plus space -> swallow_atmosphere ~saw_whitespace:true buf
   | _ -> saw_whitespace


(* Produces a single line of comment, wholesale, as a token. *)
and comment buf =
   let s = buf.sedlex in
   match%sedlex s with
   | Star (Compl (newline_char | eof)) -> COMMENT_LINE (utf8 buf) |> locate buf
   | _ -> unreachable "comment"


(* Wow. This is a monstrosity. *)
and block_comment depth buf =
   (* Js.log "token (mode: BlockComment)"; *)
   let s = buf.sedlex in
   match%sedlex s with
   | "*/" ->
      buf.mode <- (if depth = 1 then Main else BlockComment (depth - 1)) ;
      RIGHT_COMMENT_DELIM |> locate buf
   | "/*" ->
      buf.mode <- BlockComment (depth + 1) ;
      LEFT_COMMENT_DELIM |> locate buf
   | '/', Compl '*' | '*', Compl '/' | Plus (Compl ('*' | '/')) ->
      let start, _ = sedlex_of_buffer buf |> Sedlexing.lexing_positions
      and acc = Buffer.create 256 (* 3 lines of 80 chars = ~240 bytes *) in
      Buffer.add_string acc (utf8 buf) ;
      continuing_block_comment buf start acc
   | eof ->
      lexfail buf
         "Reached end-of-file without finding a matching block-comment end-delimiter"
   | _ -> unreachable "block_comment"


and continuing_block_comment buf start acc =
   let s = buf.sedlex in
   let _, curr = Sedlexing.lexing_positions s in
   match%sedlex s with
   | "*/" | "/*" ->
      Sedlexing.rollback s ;
      (COMMENT_CHUNK (Buffer.contents acc), start, curr)
   | '/', Compl '*' | '*', Compl '/' | Plus (Compl ('*' | '/')) ->
      Buffer.add_string acc (utf8 buf) ;
      continuing_block_comment buf start acc
   | eof ->
      lexfail buf
         "Reached end-of-file without finding a matching block-comment end-delimiter"
   | _ -> unreachable "continuing_block_comment"


and immediate ?(saw_whitespace = false) buf =
   (* Js.log "token (mode: Immediate)"; *)
   buf.mode <- Main ;
   let s = buf.sedlex in
   match%sedlex s with
   | eof -> EOF |> locate buf
   (* One-line comments are lexed as a single token ... *)
   | "//" -> comment buf
   (* ... while block-comments swap into a custom lexing-mode to handle proper nesting. *)
   | "/*" ->
      buf.mode <- BlockComment 1 ;
      LEFT_COMMENT_DELIM |> locate buf
   | "*/" -> lexfail buf "Unmatched block-comment end-delimiter"
   | ':' -> COLON |> locate buf
   | '|' -> PIPE |> locate buf
   | ';' -> SEMICOLON |> locate buf
   | count -> COUNT (utf8 buf) |> locate buf
   | identifier -> IDENTIFIER (utf8 buf) |> locate buf
   | "--", identifier ->
      let whole = utf8 buf in
      let flag = String.sub whole 2 (String.length whole - 2) in
      LONG_FLAG flag |> locate buf
   | "-", identifier ->
      let whole = utf8 buf in
      let flags = String.sub whole 1 (String.length whole - 1) in
      SHORT_FLAGS flags |> locate buf
   | '=' ->
      if saw_whitespace then
         lexfail buf
            "Unexpected whitespace before '='; try attaching explicit parameters directly \
             after their flag"
      else buf.mode <- Immediate ;
      EQUALS |> locate buf
   | '(' -> LEFT_PAREN |> locate buf
   | ')' -> RIGHT_PAREN |> locate buf
   | _ -> (
         match next buf.sedlex with Some c -> illegal buf c | None -> unreachable "main" )


and main buf =
   let saw_whitespace = swallow_atmosphere buf in
   immediate ~saw_whitespace buf


(** Return the next token, with location information. *)
let next_loc buf =
   match buf.mode with
   | Main -> main buf
   | Immediate -> immediate buf
   | BlockComment depth -> block_comment depth buf
   | String -> failwith "NYI"


(** Return *just* the next token, discarding location information. *)
let next buf =
   let tok, _, _ = next_loc buf in
   tok


let gen_loc buf () =
   match next_loc buf with EOF, _, _ -> None | _ as tuple -> Some tuple


let gen buf () = match next_loc buf with EOF, _, _ -> None | tok, _, _ -> Some tok

let tokens_loc buf = gen_loc buf |> Gen.to_list |> Array.of_list

let tokens buf = gen buf |> Gen.to_list |> Array.of_list

let mode buf = buf.mode
