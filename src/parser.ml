open Tokens

(* menhir interface *)
type 'a t = (token, 'a) MenhirLib.Convert.traditional

type script = AST.t

exception ParseError of Tokens.token Lexer.located

let script_automaton = ParserAutomaton.script

let statement_automaton = ParserAutomaton.statement

let parse buf p =
   let last_token = ref Lexing.(EOF, dummy_pos, dummy_pos) in
   let next_token () =
      last_token := Lexer.next_loc buf ;
      !last_token
   in
   let parser = MenhirLib.Convert.Simplified.traditional2revised p in
   try parser next_token with
   | Lexer.LexError (pos, s) -> raise (Lexer.LexError (pos, s))
   | _ -> raise (ParseError !last_token)


let parse_string s p = parse (Lexer.buffer_of_string s) p

(* let parse_file ~file p = *)
(* parse (Lexer.buffer_of_file file) p *)

let script buf = parse buf script_automaton

let script_of_string str = parse_string str script_automaton

let statement buf = parse buf statement_automaton |> Statement.dehydrate

let statement_of_string str = parse_string str statement_automaton |> Statement.dehydrate
