type 'a unresolved =
 | Unresolved
 | Resolved of 'a
 | Absent
[@@bs.deriving jsConverter]

type flag = {
   name: string;
   mutable payload: string unresolved;
} [@@bs.deriving jsConverter]

type arg =
 | Positional of string
 | Flag of flag
 [@@bs.deriving jsConverter]

type statement = {
   count: int;
   cmd: string;
   mutable args: arg array;
} [@@bs.deriving jsConverter]

type t = {
   statements: statement array;
} [@@bs.deriving jsConverter]


let make_statement ?count ~cmd ~args =
   {
      count = (match count with | Some c -> int_of_string c | None -> 1);
      cmd = cmd;
      args = Array.of_list args;
   }

let pp ast =
   let obj = tToJs ast in
   Js.Json.stringifyAny obj |> Js.log

let pp_statement stmt =
   let obj = statementToJs stmt in
   Js.Json.stringifyAny obj |> Js.log
