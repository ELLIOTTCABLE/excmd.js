(* This is a collection of parameterized nonterminals intended to be used in `parserAutomaton.mly`.
 * Avoid exposing concrete nonterminals here; all those herein defined with `%public` should include
 * at least a single parameter. *)
%%

(* Thanks, @Drup! <https://stackoverflow.com/a/53172404/31897> *)
%public optterm_list(sep, X):
 | sep? { [] }
 | li = optterm_nonempty_list(sep, X) { li }
 ;

%public optterm_nonempty_list(sep, X):
 | x = X; sep? { [x] }
 | x = X; sep; xs = separated_nonempty_list(sep, X) { x :: xs }
 ;
