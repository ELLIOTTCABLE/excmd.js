open Tokens

(* menhir interface *)
type 'a t = (token, 'a) MenhirLib.Convert.traditional

type script = AST.t

exception ParseError of Tokens.token Lexer.located

let error_loctoken_exn = function
   | ParseError loctok -> loctok
   | _ -> raise (Invalid_argument "error_loctoken_exn: expects a ParseError")


let string_of_parsing_error = function
   | Lexer.LexError (pos, desc) ->
     Some
        (String.concat ""
              [ "LexError "; "\""; desc; "\" at "; Lexer.string_of_position pos ])
   | ParseError loctok -> Some ("ParseError at " ^ Lexer.string_of_loctoken loctok)
   | _ -> None


let script_automaton = ParserAutomaton.script

let expression_automaton = ParserAutomaton.expression

let parse ?(exn = true) buf p =
   let parser = MenhirLib.Convert.Simplified.traditional2revised p in
   let last_token = ref Lexing.(EOF, dummy_pos, dummy_pos) in
   let next_token () =
      let open Lexer in
      let tok = next_loc buf in
      last_token := tok ;
      tok
   in
   try Some (parser next_token) with
    | Lexer.LexError (pos, s) -> if exn then raise (Lexer.LexError (pos, s)) else None
    | ParserAutomaton.Error -> if exn then raise (ParseError !last_token) else None


let parse_string ?exn s p = parse ?exn (Lexer.buffer_of_string s) p

(* let parse_file ~file p = *)
(* parse (Lexer.buffer_of_file file) p *)

let script ?exn buf = parse ?exn buf script_automaton

let script_of_string ?exn str = parse_string ?exn str script_automaton

let expression ?exn buf =
   match parse ?exn buf expression_automaton with
    | Some expr -> Some (Expression.dehydrate expr)
    | None -> None


let expression_of_string ?exn str =
   match parse_string ?exn str expression_automaton with
    | Some expr -> Some (Expression.dehydrate expr)
    | None -> None
