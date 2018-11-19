type statement = {
   count: int;
   cmd: string;
}
type t = {
   statements: statement list;
}

val make_statement:
   ?count: string ->
   cmd: string ->
   statement

val pp: t -> unit
val pp_statement: statement -> unit
