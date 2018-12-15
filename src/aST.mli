open Lexer

type _ node =
 | Comment : string located -> string located node
 | Node : 'a located -> 'a located node

type 'a possibly =
 | Unresolved
 | Resolved of 'a
 | Absent

type flag = {
   name: string located node;
   payload: string located node possibly;
}

type arg =
 | Positional of string
 | Flag of flag

type statement = {
   count: int located node option;
   cmd: string located node;
   args: arg located node list;
}

type t = {
   statements: statement located node list;
}

val node: (Lexing.position * Lexing.position) -> 'b -> 'b located node

val make_statement:
   ?count: string located node ->
   cmd: string located node ->
   args: arg located node list ->
   statement

val make_short_flags:
   flags: string list ->
   loc: (Lexing.position * Lexing.position) ->
   arg located node list

val pp: t -> unit
val pp_statement: statement -> unit
