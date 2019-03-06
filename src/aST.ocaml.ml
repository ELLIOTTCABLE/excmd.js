type 'a unresolved = Unresolved | Resolved of 'a | Absent [@@deriving to_yojson]

type flag = {name : string; mutable payload : string unresolved} [@@deriving to_yojson]

type arg = Positional of string | Flag of flag [@@deriving to_yojson]

type statement = {count : int; cmd : string; mutable args : arg array}
[@@deriving to_yojson]

type t = {statements : statement array} [@@deriving to_yojson]

let make_statement ?count ~cmd ~args =
   { count = (match count with Some c -> int_of_string c | None -> 1)
   ; cmd
   ; args = Array.of_list args }


let pp ast =
   let json = to_yojson ast in
   let out = Format.formatter_of_out_channel stdout in
   Yojson.Safe.pretty_print out json


let pp_statement stmt =
   let json = statement_to_yojson stmt in
   let out = Format.formatter_of_out_channel stdout in
   Yojson.Safe.pretty_print out json
