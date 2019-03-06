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
