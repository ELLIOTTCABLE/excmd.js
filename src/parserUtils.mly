(* This is a collection of parameterized nonterminals intended to be used in `parserAutomaton.mly`.
 * Avoid exposing concrete nonterminals here; all those herein defined with `%public` should include
 * at least a single parameter. *)
%%

(* This should probably be in an OCaml helper-file, instead of a meaningless nonterminal. 🤣 *)
%public %inline explode(X):
 | x = X
 {
    let last = (String.length x) - 1 in
    let rec explode str = match str with
    | "" -> []
    | str -> String.make 1 (String.get str 0) :: explode (String.sub str 1 last)
    in explode x
 }
 ;

(* Thanks, @Drup! <https://stackoverflow.com/a/53172404/31897> *)
%public optterm_list(sep, X):
 | sep? { [] }
 | xs = optterm_nonempty_list(sep, X) { xs }
 ;

%public optterm_nonempty_list(sep, X):
 | x = X; sep? { [x] }
 | x = X; sep; xs = optterm_nonempty_list(sep, X) { x :: xs }
 ;
