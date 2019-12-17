open Printf
open Excmd

let unwrap_exn = function
   | Some v -> v
   | None -> failwith "impossible None value!"


let test_script desc str =
   printf "\n\n### %s:\nParser.script %S\n" desc str ;
   Parser.script_of_string str |> unwrap_exn |> AST.pp


let test_expression desc str =
   printf "\n\n### %s:\nParser.expression %S\n" desc str ;
   Parser.expression_of_string str |> unwrap_exn |> Expression.pp


let incremental_expression desc str =
   printf "\n\n### %s:\nIncremental.expression %S\n" desc str ;
   let pp expr = Expression.dehydrate expr |> Expression.pp in
   (pp, Incremental.expression_of_string str)


let tests () =
   (* Basic expressions *)
   test_expression "Simple, single command" "test" ;
   test_expression "Single command, with count" "2test" ;

   (* Basic expressions, with parameters *)
   test_expression "Single command, with single positional parameter" "test foo" ;
   test_expression "Single command, with single positional URL" "test google.com/search" ;
   test_expression "Single command, count, and single positional parameter" "2test foo" ;
   test_expression "Single command, with multiple positional parameters" "test foo bar" ;
   test_expression "Single command, count, and multiple positional parameters"
      "2test foo bar" ;

   test_expression "Single command, with single boolean flag" "test --foo" ;
   test_expression "Single command, with multiple boolean flags" "test --foo --bar" ;
   test_expression "Single command, with single boolean short-flag" "test -f" ;
   test_expression "Single command, with multiple, concatenated boolean short-flags"
      "test -foo" ;
   test_expression "Single command, with multiple, separated boolean short-flags"
      "test -f -o -o" ;

   test_expression "Single command, with single possibly-parameterized flag"
      "test --foo bar" ;
   test_expression "Single command, with single possibly-parameterized short-flag"
      "test -f bar" ;
   test_expression "Single command, single possibly-parameterized short-flag, and a URL"
      "test -f google.com/search" ;
   test_expression
      "Single command with single possibly-parameterized flag followed by a positional \
       parameter"
      "test --foo bar baz" ;
   test_expression "Single command with two possibly-parameterized flags"
      "test --foo bar --baz widget" ;
   test_expression "Single command, with single explicitly-parameterized flag"
      "test --foo=bar" ;
   test_expression
      "Single command with single explicitly-parameterized flag followed by a positional \
       parameter"
      "test --foo=bar baz" ;
   test_expression
      "Single command, single explicitly-parameterized flag with a URL payload, followed \
       by a positional parameter"
      "test --foo=google.com/search baz" ;

   test_expression "Single command with a bare-double-dash" "test --" ;
   test_expression "Single command with a bare-double-dash followed by a long-flag"
      "test -- --foo" ;
   test_expression
      "Single command with a bare-double-dash followed by another, normal positional"
      "test -- foo" ;

   test_expression "Single command with mixed flags and parameters"
      "test --foo bar --baz=widget qux -qu ux" ;

   (* Quotation. These are, of course, going to be a nightmare of double-escaping. I'm
      sorry, Jon. *)
   test_expression "Single dquoted command" "\"test\"" ;
   test_expression "Single dquoted command with bare positional" "\"test\" foo" ;
   test_expression "Single dquoted command with bare flag" "\"test\" --foo" ;
   test_expression "Bare command with single dquoted positional" "test \"foo\"" ;
   test_expression "Single dquoted command with single dquoted positional"
      "\"test\" \"foo\"" ;
   test_expression "Single dquoted command, bare flag, and dquoted payload"
      "\"test\" --foo \"bar\"" ;
   test_expression "Single dquoted command, flag-esque positional, and positional"
      "\"test\" \"--foo\" \"bar\"" ;
   test_expression "Bare command, bare-double-dash, and quoted positional"
      "test -- \"foo bar\"" ;
   test_expression "Bare command, long-flag, flag's name quoted" "test --\"foo\"" ;
   test_expression "Bare command, long-flag, with a space in the flag's name"
      "test --\"foo bar\"" ;
   test_expression "Bare command, long-flag w/ space in name, possibly-parameterized"
      "test --\"foo bar\" baz" ;
   test_expression "Bare command, long-flag w/ space in name, explicitly-parameterized"
      "test --\"foo bar\"=baz" ;
   test_expression "Bare command, long-flag w/ space in name, explicit, quoted parameter"
      "test --\"foo bar\"=\"baz widget\"" ;

   (* Parenthetical subexpressions *)
   test_expression "Subexpression in command-position" "2(echo test)" ;
   test_expression "Subexpression in command-position with command-quotation"
      "2(\"echo test\")" ;
   test_expression "Subexpression as positional" "defer (echo test)" ;
   test_expression "Subexpression as unresolved flag payload" "defer --foo (echo test)" ;
   test_expression "Subexpression as explicit flag payload" "defer --foo=(echo test)" ;
   test_expression "Subexpression-positional after explicit flag payload"
      "defer --foo=bar (echo test)" ;
   test_expression "Nested subexpressions" "a ( b (c) d ) e" ;

   (* Piped subexpressions *)
   test_expression "Piped command" "echo test | echo" ;
   test_expression "Piped command with parenthetical subexpr"
      "echo test | (determine_command)" ;
   test_expression "Subexpression with piped command" "foo (bar baz | widget)" ;
   test_expression "Complex subexpressions, with flags and quotation"
      "defer (2echo -n --sep=\"\\n - \" (bookmark_get \"sommat else\") | do_a_thing)" ;

   (* Simple multi-expression scripts *)
   test_script "Expressions separated by semicolons" "test; 2test; 3test" ;
   test_script "Expressions separated by semicolons, with a trailing semicolon"
      "test; 2test; 3test;" ;
   test_script "Expressions, with arguments, separated by semicolons"
      "test --foo bar; 2test --foo=bar; 3test --foo bar" ;
   test_script
      "Expressions, with arguments, separated by semicolons, with a trailing semicolon"
      "test --foo bar; 2test --foo=bar; 3test --foo bar;" ;

   test_script "Newlines after expressions" "test;\n   2test;\n   3test" ;
   test_script "Newlines after expressions, with a trailing newline"
      "test;\n   2test;\n   3test;\n   " ;

   (* Incremental API *)
   let pp, entrypoint =
      incremental_expression "An acceptable expression, incrementally"
         "hello --where=world"
   in
   let accept expression = pp expression in
   let fail _last_good _failing = failwith "parsing should have succeeded" in
   Incremental.continue ~accept ~fail entrypoint ;
   let _pp, entrypoint =
      incremental_expression "A failing expression, incrementally" "hello --where="
   in
   let accept _expression = failwith "parsing should have failed" in
   let fail _last_good _failing = print_endline "fail-continuation invoked! cool." in
   Incremental.continue ~accept ~fail entrypoint ;
   let _pp, entrypoint =
      incremental_expression "Listing of acceptable tokens during a failure"
         "hello --where="
   in
   let accept _expression = failwith "parsing should have failed" in
   let fail last_good _failing =
      Incremental.acceptable_tokens last_good
      |> Array.map Lexer.show_token |> Array.to_list |> String.concat ", "
      |> print_endline
   in
   Incremental.continue ~accept ~fail entrypoint ;
   let _pp, entrypoint =
      incremental_expression "Dumping of stack-debugging information from a checkpoint"
         "hello --where="
   in
   let accept _expression = failwith "parsing should have failed" in
   let fail last_good _failing =
      Incremental.automaton_status_str last_good |> print_endline ;
      Incremental.incoming_symbol_category_str last_good |> unwrap_exn |> print_endline ;
      Incremental.incoming_symbol_type_str last_good |> unwrap_exn |> print_endline ;
      Incremental.incoming_symbol_str last_good |> unwrap_exn |> print_endline ;
      Incremental.debug_checkpoint last_good
   in
   Incremental.continue ~accept ~fail entrypoint ;
   let _pp, entrypoint =
      incremental_expression "Ascertaining of current command from a checkpoint"
         "a_command_name --blah="
   in
   let accept _expression = failwith "parsing should have failed" in
   let fail last_good _failing =
      match Incremental.current_command last_good with
       | None -> failwith "current_command should have produced a command"
       | Some (Sub _) -> failwith "current_command should have produced a literal"
       | Some (Literal str) -> print_endline str
   in
   Incremental.continue ~accept ~fail entrypoint


let () =
   Printexc.record_backtrace true ;
   match Sys.argv with
    (* Automated tests *)
    | [| _ |] -> tests ()
    (* Interactive usage *)
    | [| _; "script"; str |] -> Parser.script_of_string str |> unwrap_exn |> AST.pp
    | [| _; "expression"; str |] ->
      Parser.expression_of_string str |> unwrap_exn |> Expression.pp
    | [| _; _; _ |] ->
      raise
         (Invalid_argument
             "First argument must be a valid non-terminal (e.g. 'script' or 'expression')")
    | _ ->
      eprintf
         "!! Please provide either no arguments (to run the automated tests), or exactly \
          two arguments (for\n" ;
      eprintf
         "!! interactive experimentation): a nonterminal entry-point (e.g. 'script'), and \
          a string to parse.\n" ;
      raise (Invalid_argument "Either exactly two, or zero, arguments are required")
