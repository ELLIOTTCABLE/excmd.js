open Tokens
module Interpreter = ParserAutomaton.MenhirInterpreter
module Incremental = ParserAutomaton.Incremental

type 'a checkpoint = { status : 'a Interpreter.checkpoint; buf : Lexer.buffer }

type 'a t = Lexer.buffer -> 'a checkpoint

let script buf =
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.script curr }


let script_of_string s =
   let buf = Lexer.buffer_of_string s in
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.script curr }


let statement buf =
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.statement curr }


let statement_of_string s =
   let buf = Lexer.buffer_of_string s in
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.statement curr }


exception Break

(* FIXME: Ugly, imperative mess. *)
let acceptable_token cp =
   let { status = cp; buf = _buf } = cp in
   let len = Array.length Lexer.example_tokens in
   let accepted_token = ref None in
   ( try
        for i = 0 to len do
           let tok = Lexer.example_tokens.(i) in
           if Interpreter.acceptable cp tok Lexing.dummy_pos then accepted_token := Some tok ;
           ignore (raise Break)
        done
     with Break -> () ) ;
   match !accepted_token with
    | Some tok -> tok
    | None -> raise Not_found


let acceptable_tokens cp =
   let { status = cp; buf = _buf } = cp in
   let accepted_tokens = ref [] in
   Lexer.example_tokens
   |> Array.iter (fun tok ->
      if Interpreter.acceptable cp tok Lexing.dummy_pos then
         accepted_tokens := tok :: !accepted_tokens) ;
   Array.of_list !accepted_tokens


let continue ~accept ~fail cp =
   let { status = cp; buf } = cp in
   (* FIXME: This naive `last_token` won't be compatible with restarting. wat do *)
   let last_token = ref Lexing.(EOF, dummy_pos, dummy_pos) in
   let supplier () =
      last_token := Lexer.next_loc buf ;
      !last_token
   in
   let fail cp1 cp2 = fail { status = cp1; buf } { status = cp2; buf } in
   Interpreter.loop_handle_undo accept fail supplier cp


let automaton_status (cp : 'a checkpoint) =
   let { status = cp } = cp in
   match cp with
    | InputNeeded _env -> "InputNeeded"
    | Shifting (_before, _after, _will_need_more) -> "Shifting"
    | AboutToReduce (_env, _production) -> "AboutToReduce"
    | HandlingError _env -> "HandlingError"
    | Accepted _v -> "Accepted"
    | Rejected -> "Rejected"


let symbol_type (cp : 'a checkpoint) =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | InputNeeded env -> env
       | _ ->
         failwith "symbol_type: I don't know how to handle non-InputNeeded checkpoints"
   in
   match Interpreter.top the_env with
    | Some (Interpreter.Element (lr1state, _v, _startp, _endp)) -> (
          match Interpreter.incoming_symbol lr1state with
           | Interpreter.T _x -> "Terminal"
           | Interpreter.N _x -> "Nonterminal" )
    | None -> failwith "symbol_type: the automaton's stack is empty"


let current_command (cp : 'a checkpoint) =
   let { status = menhir_cp } = cp in
   match menhir_cp with
    (* FIXME: Are all of these actually states in which I can't determine a command? *)
    | Shifting _ | AboutToReduce _ | HandlingError _ | Accepted _ | Rejected -> None
    | InputNeeded env ->
      let rec f i =
         match Interpreter.get i env with
          | None -> None
          | Some (Interpreter.Element (lr1state, v, _startp, _endp)) -> (
                match Interpreter.incoming_symbol lr1state with
                 | Interpreter.N Interpreter.N_command -> Some (v : string)
                 | _ -> f (i + 1) )
      in
      f 0


(* Ugggggggggggggggh literally copy-pasted this into existence out of compiled files,
   there HAS to be a better way to do this ... *)
let print_stack_element el =
   match el with
    | Interpreter.Element (s, _v, _startp, _endp) -> (
          match Interpreter.incoming_symbol s with
           | Interpreter.N Interpreter.N_unterminated_statement ->
             "unterminated_statement : (AST.statement) nonterminal"
           | Interpreter.N Interpreter.N_statement -> "statement : (AST.statement) nonterminal"
           | Interpreter.N Interpreter.N_short_flags_before_positional ->
             "short_flags_before_positional : (AST.arg list) nonterminal"
           | Interpreter.N Interpreter.N_short_flags_before_flag ->
             "short_flags_before_flag : (AST.arg list) nonterminal"
           | Interpreter.N Interpreter.N_script -> "script : (AST.t) nonterminal"
           | Interpreter.N Interpreter.N_positional_and_arguments ->
             "positional_and_arguments : (AST.arg list) nonterminal"
           | Interpreter.N Interpreter.N_optterm_nonempty_list_break_unterminated_statement_ ->
             "optterm_nonempty_list_break_unterminated_statement_ : (AST.statement list) \
              nonterminal"
           | Interpreter.N Interpreter.N_optterm_list_break_unterminated_statement_ ->
             "optterm_list_break_unterminated_statement_ : (AST.statement list) nonterminal"
           | Interpreter.N Interpreter.N_option_break_ ->
             "option_break_ : (unit option) nonterminal"
           | Interpreter.N Interpreter.N_option_COUNT_ ->
             "option_COUNT_ : (string option) nonterminal"
           | Interpreter.N Interpreter.N_nonempty_arguments ->
             "nonempty_arguments : (AST.arg list) nonterminal"
           | Interpreter.N Interpreter.N_noncommand_word ->
             "noncommand_word : (string) nonterminal"
           | Interpreter.N Interpreter.N_long_flag_before_positional ->
             "long_flag_before_positional : (AST.arg) nonterminal"
           | Interpreter.N Interpreter.N_long_flag_before_flag ->
             "long_flag_before_flag : (AST.arg) nonterminal"
           | Interpreter.N Interpreter.N_list_COLON_ -> "list_COLON_ : (unit list) nonterminal"
           | Interpreter.N Interpreter.N_last_short_flags ->
             "last_short_flags : (AST.arg list) nonterminal"
           | Interpreter.N Interpreter.N_last_long_flag ->
             "last_long_flag : (AST.arg) nonterminal"
           | Interpreter.N Interpreter.N_flag_and_arguments ->
             "flag_and_arguments : (AST.arg list) nonterminal"
           | Interpreter.N Interpreter.N_command -> "command : (string) nonterminal"
           | Interpreter.N Interpreter.N_break -> "break : (unit) nonterminal"
           | Interpreter.N Interpreter.N_arguments -> "arguments : (AST.arg list) nonterminal"
           | Interpreter.T Tokens.T_error -> "error : unit terminal"
           | Interpreter.T Tokens.T_URL_START -> "URL_START : (string) terminal"
           | Interpreter.T Tokens.T_URL_REST -> "URL_REST : (string) terminal"
           | Interpreter.T Tokens.T_SEMICOLON -> "SEMICOLON : unit terminal"
           | Interpreter.T Tokens.T_QUOTE_OPEN -> "QUOTE_OPEN : (string) terminal"
           | Interpreter.T Tokens.T_QUOTE_ESCAPE -> "QUOTE_ESCAPE : (string) terminal"
           | Interpreter.T Tokens.T_QUOTE_CLOSE -> "QUOTE_CLOSE : (string) terminal"
           | Interpreter.T Tokens.T_QUOTE_CHUNK -> "QUOTE_CHUNK : (string) terminal"
           | Interpreter.T Tokens.T_PIPE -> "PIPE : unit terminal"
           | Interpreter.T Tokens.T_PAREN_OPEN -> "PAREN_OPEN : unit terminal"
           | Interpreter.T Tokens.T_PAREN_CLOSE -> "PAREN_CLOSE : unit terminal"
           | Interpreter.T Tokens.T_IDENTIFIER -> "IDENTIFIER : (string) terminal"
           | Interpreter.T Tokens.T_FLAG_LONG -> "FLAG_LONG : (string) terminal"
           | Interpreter.T Tokens.T_FLAGS_SHORT -> "FLAGS_SHORT : (string) terminal"
           | Interpreter.T Tokens.T_EQUALS -> "EQUALS : unit terminal"
           | Interpreter.T Tokens.T_EOF -> "EOF : unit terminal"
           | Interpreter.T Tokens.T_COUNT -> "COUNT : (string) terminal"
           | Interpreter.T Tokens.T_COMMENT_OPEN -> "COMMENT_OPEN : unit terminal"
           | Interpreter.T Tokens.T_COMMENT_CLOSE -> "COMMENT_CLOSE : unit terminal"
           | Interpreter.T Tokens.T_COMMENT -> "COMMENT : (string) terminal"
           | Interpreter.T Tokens.T_COLON -> "COLON : unit terminal" )


let print_stack (env : 'a Interpreter.env) =
   let rec f i =
      match Interpreter.get i env with
       | Some el ->
         print_stack_element el |> print_endline ;
         f (i + 1)
       | None -> ()
   in
   f 0


let debug_checkpoint (cp : 'a checkpoint) =
   let { status = menhir_cp } = cp in
   match menhir_cp with
    | InputNeeded env -> print_stack env
    | _ -> failwith "supposed to be InputNeeded"
