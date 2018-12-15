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
} [@@bs.deriving jsConverter]

type arg =
 | Positional of string
 | Flag of flag

type statement = {
   count: int located node option;
   cmd: string located node;
   args: arg located node list;
} [@@bs.deriving jsConverter]

type t = {
   statements: statement located node list;
} [@@bs.deriving jsConverter]

let node loc x =
   let start, eend = loc in
   Node (x, start, eend)


let make_statement ?count ~cmd ~args =
   let count' = match count with
   | Some Node (c, start, eend) -> Some (Node (int_of_string c, start, eend))
   | None -> None
   in {
      count = count';
      cmd = cmd;
      args = args;
   }

(* Increment `loc`'s character- and line-offsets by `n` characters, assuming that the increment
 * doesn't result in the offset moving past a newline. *)
let incr loc n = let open Lexing in { loc with pos_cnum = loc.pos_cnum + n }

let make_short_flags ~flags ~loc =
   let (start, eend) = loc in
   let to_flag i x =
      let start' = incr start i and end' = incr start (i + 1) in
      Flag {
         name = x |> node (start', end');
         payload = if end' = eend then Unresolved else Absent;
      } |> node (start', end')
   in List.mapi to_flag flags

let pp ast =
   let obj = tToJs ast in
   Js.Json.stringifyAny obj |> Js.log

let pp_statement stmt =
   let obj = statementToJs stmt in
   Js.Json.stringifyAny obj |> Js.log
