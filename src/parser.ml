open Tokens

(* menhir interface *)
(* type ('token, 'a) parser = ('token, 'a) MenhirLib.Convert.traditional *)

exception ParseError of Tokens.token Lexer.located


let parse buf p =
  let last_token = ref Lexing.(EOF, dummy_pos, dummy_pos) in
  let next_token () = last_token := Lexer.next_loc buf; !last_token in
  let parser = MenhirLib.Convert.Simplified.traditional2revised p in
  try parser next_token with
  | Lexer.LexError (pos, s) -> raise (Lexer.LexError (pos, s))
  | _ -> raise (ParseError (!last_token))

let parse_string s p =
  parse (Lexer.buffer_of_string s) p

(* let parse_file ~file p = *)
(* parse (Lexer.buffer_of_file file) p *)

let script buf = parse buf ParserAutomaton.script
let script_in_string s = parse_string s ParserAutomaton.script

let statement buf = parse buf ParserAutomaton.statement
let statement_in_string s = parse_string s ParserAutomaton.statement
