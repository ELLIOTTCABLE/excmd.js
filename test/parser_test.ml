open Excmd_parser

let scrpt desc str =
   Printf.printf "## %s:\nParser.script %S\n" desc str;
   AST.pp (Parser.script_in_string str);
   Printf.printf "\n\n"

let stmt desc str =
   Printf.printf "## %s:\nParser.statement %S\n" desc str;
   AST.pp_statement (Parser.statement_in_string str);
   Printf.printf "\n\n"


let tests () =
   (* Basic statements *)
   stmt "Simple, single command"
   "test";

   stmt "Single command, with count"
   "2test";

   (* Basic statements, with parameters *)
   stmt "Single command, with single positional parameter"
   "test foo";

   stmt "Single command, count, and single positional parameter"
   "2test foo";

   stmt "Single command, with multiple positional parameters"
   "test foo bar";

   stmt "Single command, count, and multiple positional parameters"
   "2test foo bar";

   (* Simple multi-statement scripts *)
   scrpt "Statements separated by semicolons"
   "test; 2test; 3test";

   scrpt "Newlines after statements"
   "test;
   2test;
   3test"


let () =
   match Sys.argv with

   (* Automated tests *)
   | [| _ |] -> tests ()

   (* Interactive usage *)
   | [| _; "script"; str |] -> AST.pp (Parser.script_in_string str)
   | [| _; "statement"; str |] -> AST.pp_statement (Parser.statement_in_string str)
   | [| _; _; _ |] -> raise (Invalid_argument
      "First argument must be a valid non-terminal (e.g. 'script' or 'statement')")

   | _ ->
      Printf.eprintf
      "!! Please provide either no arguments (to run the automated tests), or exactly two arguments (for\n";
      Printf.eprintf
      "!! interactive experimentation): a nonterminal entry-point (e.g. 'script'), and a string to parse.\n";
      raise (Invalid_argument "Either exactly two, or zero, arguments are required")
