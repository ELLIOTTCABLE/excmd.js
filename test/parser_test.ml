open Excmd_parser

let () =
   match Sys.argv with
   | [| _; str |] -> AST.pp_statement (Parser.statement_in_string str)
   | _ -> raise (Invalid_argument "Pass a single argument")
