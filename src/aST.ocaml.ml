type statement = {
   count: int;
   cmd: string;
} [@@deriving to_yojson]

type t = {
   statements: statement list;
} [@@deriving to_yojson]


let make_statement ?count ~cmd =
   {
      count = (match count with | Some c -> int_of_string c | None -> 1);
      cmd = cmd;
   }

let pp ast =
   let json = to_yojson ast in
   let out = Format.formatter_of_out_channel stdout in
   Yojson.Safe.pretty_print out json

let pp_statement stmt =
   let json = statement_to_yojson stmt in
   let out = Format.formatter_of_out_channel stdout in
   Yojson.Safe.pretty_print out json
