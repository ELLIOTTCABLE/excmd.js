type statement = {
   count: int;
   cmd: string;
}
type t = {
   statements: statement list;
}

val make_statement: count:string option -> cmd:string -> statement

val pp: t -> unit
val pp_statement: statement -> unit
