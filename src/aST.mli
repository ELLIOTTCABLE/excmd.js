type 'a unresolved =
 | Unresolved
 | Resolved of 'a
 | Absent

type flag = {
   name: string;
   payload: string unresolved;
}

type arg =
 | Positional of string
 | Flag of flag

type statement = {
   count: int;
   cmd: string;
   args: arg list;
}

type t = {
   statements: statement list;
}


val make_statement:
   ?count: string ->
   cmd: string ->
   args: arg list ->
   statement

val pp: t -> unit
val pp_statement: statement -> unit
