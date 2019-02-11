type 'a unresolved =
 | Unresolved
 | Resolved of 'a
 | Absent

type flag = {
   name: string;
   mutable payload: string unresolved;
}

type arg =
 | Positional of string
 | Flag of flag

type statement = {
   count: int;
   cmd: string;
   mutable args: arg array;
}

type t = {
   statements: statement array;
}


val make_statement:
   ?count: string ->
   cmd: string ->
   args: arg list ->
   statement

val pp: t -> unit
val pp_statement: statement -> unit
