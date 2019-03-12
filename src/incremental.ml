open Tokens
module Interpreter = ParserAutomaton.MenhirInterpreter
module Incremental = ParserAutomaton.Incremental

type 'a checkpoint = {status : 'a Interpreter.checkpoint; buf : Lexer.buffer}

type 'a t = Lexer.buffer -> 'a checkpoint

let statement buf =
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   {buf; status = Incremental.statement curr}


let statement_of_string s =
   let buf = Lexer.buffer_of_string s in
   let _start, curr = Sedlexing.lexing_positions (Lexer.sedlex_of_buffer buf) in
   {buf; status = Incremental.statement curr}


exception Break

(* FIXME: Ugly, imperative mess. *)
let acceptable_token cp =
   let {status = cp; buf = _buf} = cp in
   let len = Array.length Lexer.example_tokens in
   let accepted_token = ref None in
   ( try
        for i = 0 to len do
           let tok = Lexer.example_tokens.(i) in
           if Interpreter.acceptable cp tok Lexing.dummy_pos then accepted_token := Some tok ;
           ignore (raise Break)
        done
     with Break -> () ) ;
   match !accepted_token with Some tok -> tok | None -> raise Not_found


let acceptable_tokens cp =
   let {status = cp; buf = _buf} = cp in
   let accepted_tokens = ref [] in
   Lexer.example_tokens
   |> Array.iter (fun tok ->
      if Interpreter.acceptable cp tok Lexing.dummy_pos then
         accepted_tokens := tok :: !accepted_tokens ) ;
   Array.of_list !accepted_tokens


let continue ~accept ~fail cp =
   let {status = cp; buf} = cp in
   (* FIXME: This naive `last_token` won't be compatible with restarting. wat do *)
   let last_token = ref Lexing.(EOF, dummy_pos, dummy_pos) in
   let supplier () =
      last_token := Lexer.next_loc buf ;
      !last_token
   in
   let fail cp1 cp2 = fail {status = cp1; buf} {status = cp2; buf} in
   Interpreter.loop_handle_undo accept fail supplier cp
