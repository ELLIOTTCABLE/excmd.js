type statement = {
   count: int;
   cmd: string;
} [@@bs.deriving jsConverter]

type t = {
   statements: statement list;
} [@@bs.deriving jsConverter]


let make_statement ?count ~cmd =
   {
      count = (match count with | Some c -> int_of_string c | None -> 1);
      cmd = cmd;
   }

let pp ast =
   let obj = tToJs ast in
   Js.Json.stringifyAny obj |> Js.log

let pp_statement stmt =
   let obj = statementToJs stmt in
   Js.Json.stringifyAny obj |> Js.log
