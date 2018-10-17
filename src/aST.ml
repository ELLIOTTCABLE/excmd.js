type statement = {
   count: int;
   cmd: string;
}

type t = statement list

let make_statement count cmd =
   {
      count = (match count with | Some c -> int_of_string c | None -> 1);
      cmd = cmd;
   }
