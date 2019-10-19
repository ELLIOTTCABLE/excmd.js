open Tokens
module I = ParserAutomaton.MenhirInterpreter
module Incremental = ParserAutomaton.Incremental

(* FIXME: So. Soooooooooo. Hmm. Basically everything in this file is *way*, way too
   tightly-coupled to the specifics of the grammar; changes to parserAutomaton.mly are
   basically always going to require updates to this file in lockstep. That's nasty.
   These are the kinds of things that keep me up at night.

   There *should* be a way to keep this a little more decoupled; but I'm simply not an
   experienced-enough parser-generator-user to produce and maintain a properly-decoupled
   automaton, I suppose ... *)

type 'a checkpoint = { status : 'a I.checkpoint; buf : Lexer.buffer }

type element = I.element

type 'a t = Lexer.buffer -> 'a checkpoint

let script buf =
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.script curr }


let script_of_string s =
   let buf = Lexer.buffer_of_string s in
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.script curr }


let expression buf =
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.expression curr }


let expression_of_string s =
   let buf = Lexer.buffer_of_string s in
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   { buf; status = Incremental.expression curr }


exception Break

(* FIXME: Ugly, imperative mess. *)
let acceptable_token cp =
   let { status = cp; buf = _buf } = cp in
   let len = Array.length Lexer.example_tokens in
   let accepted_token = ref None in
   ( try
        for i = 0 to len do
           let tok = Lexer.example_tokens.(i) in
           if I.acceptable cp tok Lexing.dummy_pos then accepted_token := Some tok ;
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
      if I.acceptable cp tok Lexing.dummy_pos then
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
   I.loop_handle_undo accept fail supplier cp


let current_command cp =
   let { status = menhir_cp } = cp in
   match menhir_cp with
    (* FIXME: Are all of these actually states in which I can't determine a command? *)
    | Shifting _ | AboutToReduce _ | HandlingError _ | Accepted _ | Rejected -> None
    | InputNeeded env ->
      let rec f i =
         match I.get i env with
          | None -> None
          | Some (I.Element (lr1state, valu, _startp, _endp)) -> (
                match I.incoming_symbol lr1state with
                 | I.N I.N_command -> Some (valu : string)
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
   | I.Element (lr1state, _valu, _startp, _endp) -> (
         match I.incoming_symbol lr1state with
          | I.T _x -> "Terminal"
          | I.N _x -> "Nonterminal" )


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
   match I.top the_env with
    | Some el -> Some (element_incoming_symbol_category_str el)
    | None -> None


(* Ugggggggggggggggh literally copy-pasted this into existence out of compiled files,
   there HAS to be a better way to do this ...

   Vi command: %s/\vI.N_(\S+) : \((.+)\) nonterminal/I.N_\1 -> ("\1", "\2") *)
let element_incoming_symbol_desc = function
   | I.Element (lr1state, _valu, _startp, _endp) -> (
         match I.incoming_symbol lr1state with
          | I.N I.N_unterminated_expression -> ("unterminated_expression", "AST.expression")
          | I.N I.N_expression -> ("expression", "AST.expression")
          | I.N I.N_short_flags_before_positional ->
            ("short_flags_before_positional", "AST.arg list")
          | I.N I.N_short_flags_before_flag -> ("short_flags_before_flag", "AST.arg list")
          | I.N I.N_script -> ("script", "AST.t")
          | I.N I.N_rev_subquotation -> ("rev_subquotation", "string list")
          | I.N I.N_rev_nonempty_subquotation -> ("rev_nonempty_subquotation", "string list")
          | I.N I.N_rev_nonempty_quotation -> ("rev_nonempty_quotation", "string list")
          | I.N I.N_quotation_chunk -> ("quotation_chunk", "string")
          | I.N I.N_quotation -> ("quotation", "string")
          | I.N I.N_positional_and_arguments -> ("positional_and_arguments", "AST.arg list")
          | I.N I.N_optterm_nonempty_list_break_unterminated_expression_ ->
            ("optterm_nonempty_list_break_unterminated_expression_", "AST.expression list")
          | I.N I.N_optterm_list_break_unterminated_expression_ ->
            ("optterm_list_break_unterminated_expression_", "AST.expression list")
          | I.N I.N_option_break_ -> ("option_break_", "unit option")
          | I.N I.N_option_COUNT_ -> ("option_COUNT_", "string option")
          | I.N I.N_nonempty_arguments -> ("nonempty_arguments", "AST.arg list")
          | I.N I.N_noncommand_word -> ("noncommand_word", "string")
          | I.N I.N_long_flag_before_positional -> ("long_flag_before_positional", "AST.arg")
          | I.N I.N_long_flag_before_flag -> ("long_flag_before_flag", "AST.arg")
          | I.N I.N_list_COLON_ -> ("list_COLON_", "unit list")
          | I.N I.N_last_short_flags -> ("last_short_flags", "AST.arg list")
          | I.N I.N_last_long_flag -> ("last_long_flag", "AST.arg")
          | I.N I.N_flags_short -> ("flags_short", "string")
          | I.N I.N_flag_long -> ("flag_long", "string")
          | I.N I.N_flag_and_arguments -> ("flag_and_arguments", "AST.arg list")
          | I.N I.N_command -> ("command", "string")
          | I.N I.N_break -> ("break", "unit")
          | I.N I.N_arguments -> ("arguments", "AST.arg list")
          | I.T Tokens.T_error -> ("error", "unit")
          | I.T Tokens.T_URL_START -> ("URL_START", "string")
          | I.T Tokens.T_URL_REST -> ("URL_REST", "string")
          | I.T Tokens.T_SEMICOLON -> ("SEMICOLON", "unit")
          | I.T Tokens.T_QUOTE_OPEN -> ("QUOTE_OPEN", "string")
          | I.T Tokens.T_QUOTE_ESCAPE -> ("QUOTE_ESCAPE", "string")
          | I.T Tokens.T_QUOTE_CLOSE -> ("QUOTE_CLOSE", "string")
          | I.T Tokens.T_QUOTE_CHUNK -> ("QUOTE_CHUNK", "string")
          | I.T Tokens.T_PIPE -> ("PIPE", "unit")
          | I.T Tokens.T_PAREN_OPEN -> ("PAREN_OPEN", "unit")
          | I.T Tokens.T_PAREN_CLOSE -> ("PAREN_CLOSE", "unit")
          | I.T Tokens.T_IDENTIFIER -> ("IDENTIFIER", "string")
          | I.T Tokens.T_FLAG_LONG_START -> ("FLAG_LONG_START", "string")
          | I.T Tokens.T_FLAGS_SHORT_START -> ("FLAGS_SHORT_START", "string")
          | I.T Tokens.T_EQUALS -> ("EQUALS", "unit")
          | I.T Tokens.T_EOF -> ("EOF", "unit")
          | I.T Tokens.T_ERR_UNEXPECTED_WHITESPACE -> ("ERR_UNEXPECTED_WHITESPACE", "string")
          | I.T Tokens.T_ERR_UNEXPECTED_QUOTE_ESCAPE ->
            ("ERR_UNEXPECTED_QUOTE_ESCAPE", "string * string")
          | I.T Tokens.T_ERR_UNEXPECTED_QUOTE_CLOSE ->
            ("ERR_UNEXPECTED_QUOTE_CLOSE", "string * string")
          | I.T Tokens.T_ERR_UNEXPECTED_COMMENT_CLOSE ->
            ("ERR_UNEXPECTED_COMMENT_CLOSE", "string")
          | I.T Tokens.T_ERR_UNEXPECTED_CHARACTER -> ("ERR_UNEXPECTED_CHARACTER", "int * string")
          | I.T Tokens.T_ERR_MISSING_DELIM_CLOSE ->
            ("ERR_MISSING_DELIM_CLOSE", "string * string")
          | I.T Tokens.T_ERR_MISSING_COMMENT_CLOSE -> ("ERR_MISSING_COMMENT_CLOSE", "string")
          | I.T Tokens.T_COUNT -> ("COUNT", "string")
          | I.T Tokens.T_COMMENT_OPEN -> ("COMMENT_OPEN", "unit")
          | I.T Tokens.T_COMMENT_CLOSE -> ("COMMENT_CLOSE", "unit")
          | I.T Tokens.T_COMMENT -> ("COMMENT", "string")
          | I.T Tokens.T_COLON -> ("COLON", "unit")
          | I.T Tokens.T_BARE_DOUBLE_DASH -> ("BARE_DOUBLE_DASH", "unit") )


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
   match I.top the_env with
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
   match I.top the_env with
    | Some el -> Some (element_incoming_symbol_str el)
    | None -> None


let element_incoming_symbol_desc_str el =
   let cat = element_incoming_symbol_category_str el in
   match element_incoming_symbol_desc el with
    | name, typ -> String.concat "" [ name; " : ("; typ; ") "; cat ]


let print_stack (env : 'a I.env) =
   let rec f i =
      match I.get i env with
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
   I.get idx the_env


let get_after cp idx =
   let { status = cp } = cp in
   let the_env =
      match cp with
       | Shifting (_before, after, _final) -> after
       | _ ->
         failwith "get_after: This function is only relevant for Shifting checkpoints"
   in
   I.get idx the_env
