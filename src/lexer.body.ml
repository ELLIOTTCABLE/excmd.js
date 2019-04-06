(* This file is appended to uAX31.ml, the output of the Unicode classifier in pkg/. *)

open Tokens
open Sedlexing

type mode = BareURL | CommentBlock of int | Immediate | Main

type buffer = {sedlex : Sedlexing.lexbuf; mutable mode : mode}

type 'a located = 'a * Lexing.position * Lexing.position

type 'a gen = unit -> 'a option

exception LexError of Lexing.position * string

exception ParseError of token located

(* {2 Constants } *)

(* Note that this depends on the JS-shim, so it's limited to the *common* functionality
   of the JavaScript and OCaml regex engines. Keep it simple. *)
let known_schemes =
   Js.Re.fromStringWithFlags ~flags:"i"
      "^(about|data?|f(eed|ile|tp)|g(eo|opher)|https?|i(nfo|rc[6s]?)|ldaps?|m(agnet|ailto)|n(ews|fs|ntp)|rsync|t(ag|elnet)|urn|view-source|wss?|xmpp|ymsgr):"


let opening_for = [(")", "("); ("]", "[")]

let closing_for = [("(", ")"); ("[", "]")]

let is_known_scheme str = Js.Re.test str known_schemes

let buffer_of_sedlex sedlex = {sedlex; mode = Main}

let sedlex_of_buffer buf = buf.sedlex

(* {2 Constructors } *)
let buffer_of_string str = buffer_of_sedlex (Utf8.from_string str)

(* {2 Helpers } *)
let lexing_positions buf = sedlex_of_buffer buf |> lexing_positions

let locate buf tok =
   let start, curr = lexing_positions buf in
   (tok, start, curr)


let curr buf =
   let _start, curr = lexing_positions buf in
   curr


let start buf =
   let start, _curr = lexing_positions buf in
   start


let utf8 buf = sedlex_of_buffer buf |> Utf8.lexeme

let lexfail buf s = raise (LexError (curr buf, s))

let illegal buf c =
   Uchar.to_int c
   |> Printf.sprintf "unexpected character in expression: 'U+%04X'"
   |> lexfail buf


let unreachable str = failwith (Printf.sprintf "Unreachable: %s" str)

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
let show_token tok =
   match tok with
    | COLON -> "COLON"
    | COMMENT _ -> "COMMENT"
    | COMMENT_CLOSE -> "COMMENT_CLOSE"
    | COMMENT_OPEN -> "COMMENT_OPEN"
    | COUNT _ -> "COUNT"
    | EOF -> "EOF"
    | EQUALS -> "EQUALS"
    | IDENTIFIER _ -> "IDENTIFIER"
    | FLAG_LONG _ -> "FLAG_LONG"
    | PAREN_CLOSE -> "PAREN_CLOSE"
    | PAREN_OPEN -> "PAREN_OPEN"
    | PIPE -> "PIPE"
    | SEMICOLON -> "SEMICOLON"
    | FLAGS_SHORT _ -> "FLAGS_SHORT"
    | URL_REST _ -> "URL_REST"
    | URL_START _ -> "URL_START"


let example_of_token tok =
   match tok with
    | COLON -> ":"
    | COMMENT str -> if str != "" then str else "a comment"
    | COMMENT_CLOSE -> "*/"
    | COMMENT_OPEN -> "/*"
    | COUNT str -> if str != "" then str else "2"
    | EOF -> ""
    | EQUALS -> "="
    | IDENTIFIER str -> if str != "" then str else "ident"
    | FLAG_LONG flag -> if flag != "" then "--" ^ flag else "--flag"
    | PAREN_CLOSE -> ")"
    | PAREN_OPEN -> "("
    | PIPE -> "|"
    | SEMICOLON -> ";"
    | FLAGS_SHORT flags -> if flags != "" then "-" ^ flags else "-FlGs"
    | URL_REST url -> if url != "" then url else "/search?q=tridactyl"
    | URL_START url -> if url != "" then url else "google.com"


let example_tokens =
   (* This weird backflipping, is to avoid *even more* duplication: every possible
      "example token" is consistently encoded only in [example_of_token]. *)
   let ex = example_of_token in
   [| COLON
    ; COMMENT (COMMENT "" |> ex)
    ; COMMENT_CLOSE
    ; COMMENT_OPEN
    ; COUNT (COUNT "" |> ex)
    ; EOF
    ; EQUALS
    ; IDENTIFIER (IDENTIFIER "" |> ex)
    ; FLAG_LONG (FLAG_LONG "" |> ex)
    ; PAREN_CLOSE
    ; PAREN_OPEN
    ; PIPE
    ; SEMICOLON
    ; FLAGS_SHORT (FLAGS_SHORT "" |> ex)
    ; URL_REST (URL_REST "" |> ex)
    ; URL_START (URL_START "" |> ex) |]


let compare_token a b =
   if a = b then true
   else
   match (a, b) with
    | COUNT _, COUNT _
    | COMMENT _, COMMENT _
    | IDENTIFIER _, IDENTIFIER _
    | FLAG_LONG _, FLAG_LONG _
    | FLAGS_SHORT _, FLAGS_SHORT _
    | URL_REST _, URL_REST _
    | URL_START _, URL_START _ -> true
    | _ -> false


let token_body tok =
   match tok with
    | COUNT s
    | COMMENT s
    | IDENTIFIER s
    | FLAG_LONG s
    | FLAGS_SHORT s
    | URL_REST s
    | URL_START s -> Some s
    | _ -> None


let url_opening_fail buf opening closing =
   lexfail buf
      (String.concat "`"
          [ "Unmatched closing "
          ; closing
          ; " in a bare URL - delimiters must be balanced. (Did you forget a "
          ; opening
          ; "? If not, try enclosing the URL in quotes.)" ])


let url_closing_fail buf opening closing =
   lexfail buf
      (String.concat "`"
          [ "Unmatched opening "
          ; opening
          ; " in bare URL - delimiters must be balanced. (Did you forget a "
          ; closing
          ; "? If not, try enclosing the URL in quotes.)" ])


let url_pop_delim buf closing xs =
   let opening = List.assoc closing opening_for in
   match xs with
    | [] -> url_opening_fail buf opening closing
    | hd :: tl ->
      if hd != opening then
         let missing_closing = List.assoc hd closing_for in
         url_closing_fail buf hd missing_closing
      else tl


(* {2 Regular expressions } *)
let newline_char = [%sedlex.regexp? '\r' | '\n']

let newline = [%sedlex.regexp? "\r\n" | newline_char]

(* FIXME: Expand definition of whitespace to follow TR31 *)
let space_char = [%sedlex.regexp? white_space]

let space = [%sedlex.regexp? Sub (space_char, newline_char) | newline]

let zero = [%sedlex.regexp? '0']

let nonzero = [%sedlex.regexp? '1' .. '9']

let digit = [%sedlex.regexp? zero | nonzero]

let count = [%sedlex.regexp? nonzero, Star digit]

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


(* ASCII '.' FULL STOP *is* valid in identifiiers, but triggers the URL-specific lexing-
   mode. *)
let non_url_medial_char = [%sedlex.regexp? Sub (medial_char, '.')]

(* UAX31-D1:
 *
 *     <Identifier> := <Start> <Continue>* (<Medial> <Continue>+)*
*)
let identifier =
   [%sedlex.regexp?
         start_char, Star continue_char, Star (non_url_medial_char, Plus continue_char)]


let url_domain =
   [%sedlex.regexp?
         start_char, Star continue_char, Star (medial_char, Plus continue_char)]


let all_identifier_char = [%sedlex.regexp? start_char | medial_char | continue_char]

let ascii_letter = [%sedlex.regexp? 'a' .. 'z' | 'A' .. 'Z']

let url_scheme_char = [%sedlex.regexp? ascii_letter | '+' | '-' | '.']

(* Doesn't need to use the full [url_scheme_char]; only needs to briefly detect things
   which the [known_schemes] regex might match. *)
let url_possible_scheme = [%sedlex.regexp? Rep (ascii_letter, 2 .. 6), ':']

let url_doubleslash_scheme = [%sedlex.regexp? Star url_scheme_char, "://"]

(* These are characters that can't be included in a URL *at all* without quotation. *)
let urlbody_illegal_char = [%sedlex.regexp? space_char | '|']

(* Characters that won't end bare URLs, as long as they're balanced. *)
let urlbody_opening_char = [%sedlex.regexp? Chars "[("]

let urlbody_closing_char = [%sedlex.regexp? Chars "])"]

(* Characters allowed even in the very last position in a bare URL. *)
let urlbody_continue_special_char = [%sedlex.regexp? Chars "-._/+"]

(* Characters that won't end bare URLs when in included in the middle, but that won't be
   included when at the end. *)
let urlbody_medial_special_char = [%sedlex.regexp? Chars "!#$%&*,:;=?@~"]

let urlbody_continue_char =
   [%sedlex.regexp?
         Sub
         ( (all_identifier_char | urlbody_continue_special_char)
         , ( urlbody_medial_special_char | urlbody_illegal_char | urlbody_opening_char
           | urlbody_closing_char ) )]


(* {2 Lexer body } *)

(* Swallow and discard whitespace; produces no tokens. *)
let rec swallow_atmosphere ?(saw_whitespace = false) buf =
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | Plus space -> swallow_atmosphere ~saw_whitespace:true buf
    | _ -> saw_whitespace


(* Produces a single line of comment, wholesale, as a token. *)
and comment buf =
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | Star (Compl (newline_char | eof)) -> COMMENT (utf8 buf) |> locate buf
    | _ -> unreachable "comment"


(* Wow. This is a monstrosity. *)
and comment_block depth buf =
   (* Js.log "token (mode: CommentBlock)"; *)
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | "*/" ->
      buf.mode <- (if depth = 1 then Main else CommentBlock (depth - 1)) ;
      COMMENT_CLOSE |> locate buf
    | "/*" ->
      buf.mode <- CommentBlock (depth + 1) ;
      COMMENT_OPEN |> locate buf
    | '/', Compl '*' | '*', Compl '/' | Plus (Compl ('*' | '/')) ->
      let acc = Buffer.create 256 (* 3 lines of 80 chars = ~240 bytes *) in
      Buffer.add_string acc (utf8 buf) ;
      comment_block_continuing buf (start buf) acc
    | eof ->
      lexfail buf
         "Reached end-of-file without finding a matching block-comment end-delimiter"
    | _ -> unreachable "comment_block"


and comment_block_continuing buf orig_start acc =
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | "*/" | "/*" ->
      rollback slbuf ;
      (COMMENT (Buffer.contents acc), orig_start, curr buf)
    | '/', Compl '*' | '*', Compl '/' | Plus (Compl ('*' | '/')) ->
      Buffer.add_string acc (utf8 buf) ;
      comment_block_continuing buf orig_start acc
    | eof ->
      lexfail buf
         "Reached end-of-file without finding a matching block-comment end-delimiter"
    | _ -> unreachable "comment_block_continuing"


and known_scheme_or_identifier buf =
   let str = utf8 buf in
   (* Js.log ("token: possibly known scheme, " ^ str); *)
   (* If this isn't a known scheme, we don't want to create an infinite loop by returning
      [buf] to [immediate]; so we fast-forward to producing only the [IDENTIFIER] portion
      of this non-scheme word. *)
   if not (is_known_scheme str) then (
      rollback (sedlex_of_buffer buf) ;
      just_identifier buf )
   else url_start buf


and url_start buf =
   buf.mode <- BareURL ;
   URL_START (utf8 buf) |> locate buf


and url_rest buf =
   (* Js.log "token (mode: BareURL)"; *)
   (* 99.5th% confidence interval for URLs is 218 chars.
      <https://stackoverflow.com/a/31758386/31897> *)
   let acc = Buffer.create 256 in
   url_no_delim buf (start buf) (curr buf) acc


and url_no_delim buf orig_start prev_end acc =
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | Star (urlbody_continue_char | urlbody_medial_special_char), urlbody_continue_char ->
      Buffer.add_string acc (utf8 buf) ;
      url_no_delim buf orig_start (curr buf) acc
    | urlbody_opening_char ->
      let delim = utf8 buf in
      Buffer.add_string acc delim ;
      url_inside_delims buf orig_start acc [delim]
    (* These cases are identical; but Sedlex demands that the last case stand alone. |
       urlbody_illegal_char | urlbody_closing_char -> *)
    | _ ->
      rollback slbuf ;
      url_finish buf orig_start prev_end acc


and url_inside_delims buf orig_start acc open_delims =
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | Star (urlbody_continue_char | urlbody_medial_special_char), urlbody_continue_char ->
      Buffer.add_string acc (utf8 buf) ;
      url_inside_delims buf orig_start acc open_delims
    | urlbody_opening_char ->
      let delim = utf8 buf in
      Buffer.add_string acc delim ;
      url_inside_delims buf orig_start acc (delim :: open_delims)
    | urlbody_closing_char -> (
          let delim = utf8 buf in
          Buffer.add_string acc delim ;
          match url_pop_delim buf delim open_delims with
           | [] -> url_no_delim buf orig_start (curr buf) acc
           | remaining -> url_inside_delims buf orig_start acc remaining )
    (* These cases are identical; but Sedlex demands that the last case stand alone. |
       urlbody_illegal_char -> *)
    | _ ->
      let most_recent_opening = List.hd open_delims in
      let missing_closing = List.assoc most_recent_opening closing_for in
      url_closing_fail buf most_recent_opening missing_closing


and url_finish buf start curr acc =
   buf.mode <- Main ;
   (URL_REST (Buffer.contents acc), start, curr)


and just_identifier buf =
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | identifier -> IDENTIFIER (utf8 buf) |> locate buf
    | _ -> unreachable "just_identifier"


and immediate ?(saw_whitespace = false) buf =
   (* Js.log "token (mode: Immediate)"; *)
   buf.mode <- Main ;
   let slbuf = sedlex_of_buffer buf in
   match%sedlex slbuf with
    | eof -> EOF |> locate buf
    (* One-line comments are lexed as a single token ... *)
    | "//" -> comment buf
    (* ... while block-comments swap into a custom lexing-mode to handle proper nesting. *)
    | "/*" ->
      buf.mode <- CommentBlock 1 ;
      COMMENT_OPEN |> locate buf
    | "*/" -> lexfail buf "Unmatched block-comment end-delimiter"
    | ':' -> COLON |> locate buf
    | '|' -> PIPE |> locate buf
    | ';' -> SEMICOLON |> locate buf
    | count -> COUNT (utf8 buf) |> locate buf
    | url_doubleslash_scheme -> url_start buf
    | url_possible_scheme -> known_scheme_or_identifier buf
    | identifier -> IDENTIFIER (utf8 buf) |> locate buf
    | url_domain -> url_start buf
    | "--", identifier ->
      let whole = utf8 buf in
      let flag = String.sub whole 2 (String.length whole - 2) in
      FLAG_LONG flag |> locate buf
    | "-", identifier ->
      let whole = utf8 buf in
      let flags = String.sub whole 1 (String.length whole - 1) in
      FLAGS_SHORT flags |> locate buf
    | '=' ->
      if saw_whitespace then
         lexfail buf
            "Unexpected whitespace before '='; try attaching explicit parameters directly \
             after their flag"
      else buf.mode <- Immediate ;
      EQUALS |> locate buf
    | '(' -> PAREN_OPEN |> locate buf
    | ')' -> PAREN_CLOSE |> locate buf
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
    | BareURL -> url_rest buf
    | CommentBlock depth -> comment_block depth buf


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
