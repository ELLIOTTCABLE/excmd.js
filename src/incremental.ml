open Tokens
module Interpreter = ParserAutomaton.MenhirInterpreter
module Incremental = ParserAutomaton.Incremental

(* FIXME: So. Soooooooooo. Hmm. Basically everything in this file is *way*, way too
   tightly-coupled to the specifics of the grammar; changes to parserAutomaton.mly are
   basically always going to require updates to this file in lockstep. That's nasty.
   These are the kinds of things that keep me up at night.

   There *should* be a way to keep this a little more decoupled; but I'm simply not an
   experienced-enough parser-generator-user to produce and maintain a properly-decoupled
   automaton, I suppose ... *)

type 'a checkpoint = { status : 'a Interpreter.checkpoint; buf : Lexer.buffer }

type element = ParserAutomaton.MenhirInterpreter.element

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


let current_command cp =
   let { status = menhir_cp } = cp in
   match menhir_cp with
    (* FIXME: Are all of these actually states in which I can't determine a command? *)
    | Shifting _ | AboutToReduce _ | HandlingError _ | Accepted _ | Rejected -> None
    | InputNeeded env ->
      let rec f i =
         match Interpreter.get i env with
          | None -> None
          | Some (Interpreter.Element (lr1state, valu, _startp, _endp)) -> (
                match Interpreter.incoming_symbol lr1state with
                 | Interpreter.N Interpreter.N_command -> Some (valu : string)
                 | _ -> f (i + 1) )
      in
      f 0


let automaton_status_str cp =
   let { status = cp } = cp in
   match cp with
    | InputNeeded _env -> "InputNeeded"
    | Shifting (_before, _after, _will_need_more) -> "Shifting"
    | AboutToReduce (_env, _production) -> "AboutToReduce"
    | HandlingError _env -> "HandlingError"
    | Accepted _v -> "Accepted"
    | Rejected -> "Rejected"


let element_incoming_symbol_category_str = function
   | Interpreter.Element (lr1state, _valu, _startp, _endp) -> (
         match Interpreter.incoming_symbol lr1state with
          | Interpreter.T _x -> "Terminal"
          | Interpreter.N _x -> "Nonterminal" )


let incoming_symbol_category_str cp =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | InputNeeded env -> env
       (* FIXME: Should I, indeed, take the [before] state, here? *)
       | Shifting (before, _after, _final) -> before
       | AboutToReduce (env, _prod) -> env
       | HandlingError env -> env
       | Accepted _v ->
         failwith
            "incoming_symbol_category: I don't know how to handle Accepted checkpoints"
       | Rejected ->
         failwith
            "incoming_symbol_category: I don't know how to handle Rejected checkpoints"
   in
   match Interpreter.top the_env with
    | Some el -> Some (element_incoming_symbol_category_str el)
    | None -> None


(* Ugggggggggggggggh literally copy-pasted this into existence out of compiled files,
   there HAS to be a better way to do this ... *)
let element_incoming_symbol_desc = function
   | Interpreter.Element (lr1state, _valu, _startp, _endp) -> (
         match Interpreter.incoming_symbol lr1state with
          | Interpreter.N Interpreter.N_unterminated_statement ->
            ("unterminated_statement", "AST.statement")
          | Interpreter.N Interpreter.N_statement -> ("statement", "AST.statement")
          | Interpreter.N Interpreter.N_short_flags_before_positional ->
            ("short_flags_before_positional", "AST.arg list")
          | Interpreter.N Interpreter.N_short_flags_before_flag ->
            ("short_flags_before_flag", "AST.arg list")
          | Interpreter.N Interpreter.N_script -> ("script", "AST.t")
          | Interpreter.N Interpreter.N_positional_and_arguments ->
            ("positional_and_arguments", "AST.arg list")
          | Interpreter.N Interpreter.N_optterm_nonempty_list_break_unterminated_statement_ ->
            ("optterm_nonempty_list_break_unterminated_statement_", "AST.statement list")
          | Interpreter.N Interpreter.N_optterm_list_break_unterminated_statement_ ->
            ("optterm_list_break_unterminated_statement_", "AST.statement list")
          | Interpreter.N Interpreter.N_option_break_ -> ("option_break_", "unit option")
          | Interpreter.N Interpreter.N_option_COUNT_ -> ("option_COUNT_", "string option")
          | Interpreter.N Interpreter.N_nonempty_arguments ->
            ("nonempty_arguments", "AST.arg list")
          | Interpreter.N Interpreter.N_noncommand_word -> ("noncommand_word", "string")
          | Interpreter.N Interpreter.N_long_flag_before_positional ->
            ("long_flag_before_positional", "AST.arg")
          | Interpreter.N Interpreter.N_long_flag_before_flag ->
            ("long_flag_before_flag", "AST.arg")
          | Interpreter.N Interpreter.N_list_COLON_ -> ("list_COLON_", "unit list")
          | Interpreter.N Interpreter.N_last_short_flags -> ("last_short_flags", "AST.arg list")
          | Interpreter.N Interpreter.N_last_long_flag -> ("last_long_flag", "AST.arg")
          | Interpreter.N Interpreter.N_flag_and_arguments ->
            ("flag_and_arguments", "AST.arg list")
          | Interpreter.N Interpreter.N_command -> ("command", "string")
          | Interpreter.N Interpreter.N_break -> ("break", "unit")
          | Interpreter.N Interpreter.N_arguments -> ("arguments", "AST.arg list")
          | Interpreter.T Tokens.T_error -> ("error", "unit")
          | Interpreter.T Tokens.T_URL_START -> ("URL_START", "string")
          | Interpreter.T Tokens.T_URL_REST -> ("URL_REST", "string")
          | Interpreter.T Tokens.T_SEMICOLON -> ("SEMICOLON", "unit")
          | Interpreter.T Tokens.T_QUOTE_OPEN -> ("QUOTE_OPEN", "string")
          | Interpreter.T Tokens.T_QUOTE_ESCAPE -> ("QUOTE_ESCAPE", "string")
          | Interpreter.T Tokens.T_QUOTE_CLOSE -> ("QUOTE_CLOSE", "string")
          | Interpreter.T Tokens.T_QUOTE_CHUNK -> ("QUOTE_CHUNK", "string")
          | Interpreter.T Tokens.T_PIPE -> ("PIPE", "unit")
          | Interpreter.T Tokens.T_PAREN_OPEN -> ("PAREN_OPEN", "unit")
          | Interpreter.T Tokens.T_PAREN_CLOSE -> ("PAREN_CLOSE", "unit")
          | Interpreter.T Tokens.T_IDENTIFIER -> ("IDENTIFIER", "string")
          | Interpreter.T Tokens.T_FLAG_LONG -> ("FLAG_LONG", "string")
          | Interpreter.T Tokens.T_FLAGS_SHORT -> ("FLAGS_SHORT", "string")
          | Interpreter.T Tokens.T_EQUALS -> ("EQUALS", "unit")
          | Interpreter.T Tokens.T_EOF -> ("EOF", "unit")
          | Interpreter.T Tokens.T_COUNT -> ("COUNT", "string")
          | Interpreter.T Tokens.T_COMMENT_OPEN -> ("COMMENT_OPEN", "unit")
          | Interpreter.T Tokens.T_COMMENT_CLOSE -> ("COMMENT_CLOSE", "unit")
          | Interpreter.T Tokens.T_COMMENT -> ("COMMENT", "string")
          | Interpreter.T Tokens.T_COLON -> ("COLON", "unit") )


let element_incoming_symbol_type_str el =
   match element_incoming_symbol_desc el with
    | _name, typ -> typ


let incoming_symbol_type_str cp =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | InputNeeded env -> env
       (* FIXME: Should I, indeed, take the [before] state, here? *)
       | Shifting (before, _after, _final) -> before
       | AboutToReduce (env, _prod) -> env
       | HandlingError env -> env
       | Accepted _v ->
         failwith "incoming_symbol_type: I don't know how to handle Accepted checkpoints"
       | Rejected ->
         failwith "incoming_symbol_type: I don't know how to handle Rejected checkpoints"
   in
   match Interpreter.top the_env with
    | Some el -> Some (element_incoming_symbol_type_str el)
    | None -> None


let element_incoming_symbol_str el =
   match element_incoming_symbol_desc el with
    | name, _typ -> name


let incoming_symbol_str cp =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | InputNeeded env -> env
       (* FIXME: Should I, indeed, take the [before] state, here? *)
       | Shifting (before, _after, _final) -> before
       | AboutToReduce (env, _prod) -> env
       | HandlingError env -> env
       | Accepted _v ->
         failwith "incoming_symbol: I don't know how to handle Accepted checkpoints"
       | Rejected ->
         failwith "incoming_symbol: I don't know how to handle Rejected checkpoints"
   in
   match Interpreter.top the_env with
    | Some el -> Some (element_incoming_symbol_str el)
    | None -> None


let element_incoming_symbol_desc_str el =
   let cat = element_incoming_symbol_category_str el in
   match element_incoming_symbol_desc el with
    | name, typ -> String.concat "" [ name; " : ("; typ; ") "; cat ]


let print_stack (env : 'a Interpreter.env) =
   let rec f i =
      match Interpreter.get i env with
       | Some el ->
         element_incoming_symbol_desc_str el |> print_endline ;
         f (i + 1)
       | None -> ()
   in
   f 0


let debug_checkpoint cp =
   let { status = menhir_cp } = cp in
   match menhir_cp with
    | InputNeeded env -> print_stack env
    | _ -> failwith "supposed to be InputNeeded"


let get_before cp idx =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | InputNeeded env -> env
       | Shifting (before, _after, _final) -> before
       | AboutToReduce (env, _prod) -> env
       | HandlingError env -> env
       | Accepted _v ->
         failwith "get_before: I don't know how to handle Accepted checkpoints"
       | Rejected ->
         failwith "get_before: I don't know how to handle Rejected checkpoints"
   in
   Interpreter.get idx the_env


let get_after cp idx =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | Shifting (_before, after, _final) -> after
       | _ ->
         failwith "get_after: This function is only relevant for Shifting checkpoints"
   in
   Interpreter.get idx the_env
