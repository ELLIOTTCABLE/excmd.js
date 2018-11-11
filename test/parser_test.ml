open Excmd_parser

let () =
   match Sys.argv with
   | [| _; "script"; str |] -> AST.pp (Parser.script_in_string str)
   | [| _; "statement"; str |] -> AST.pp_statement (Parser.statement_in_string str)
   | [| _; _; _ |] -> raise (Invalid_argument
      "First argument must be a valid non-terminal (e.g. 'script' or 'statement')")
   | _ -> raise (Invalid_argument "Two arguments are required")
