type 'a unresolved =
 | Unresolved
 | Resolved of 'a
 | Absent
[@@bs.deriving jsConverter]

type flag = {
   name: string;
   payload: string unresolved;
} [@@bs.deriving jsConverter]

type arg =
 | Positional of string
 | Flag of flag
 [@@bs.deriving jsConverter]

type statement = {
   count: int;
   cmd: string;
   args: arg list;
} [@@bs.deriving jsConverter]

type t = {
   statements: statement list;
} [@@bs.deriving jsConverter]


let make_statement ?count ~cmd ~args =
   {
      count = (match count with | Some c -> int_of_string c | None -> 1);
      cmd = cmd;
      args = args;
   }

let pp ast =
   let obj = tToJs ast in
   Js.Json.stringifyAny obj |> Js.log

let pp_statement stmt =
   let obj = statementToJs stmt in
   Js.Json.stringifyAny obj |> Js.log
