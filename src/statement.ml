open AST

type t = statement

let hydrate st = st
let dehydrate st = st

let pp st = AST.pp_statement st

let count st = st.count
let command st = st.cmd

(* These are a mess of mutating code instead of simple, functional iteration, mostly because this
 * library is targeting JavaScript, at the end of the day. This is all wrapped in a JavaScript class
 * that appears to wrap a mutable parse-result; so it might as well be *actually* mutable, no? *)

let mem key st =
   let is_key = function
   | Positional _ -> false
   | Flag f -> f.name == key
   in
   (* FIXME: This is slow, but Array.exists isn't available until OCaml 4.03, and I am lazy. *)
   List.exists is_key (Array.to_list st.args)

let resolve_flags st =
   let consuming_flag = ref None in
   let iterator arg =
      match arg with
      | Positional str ->
         begin match !consuming_flag with
         | None -> true
         | Some arg ->
            arg.payload <- Resolved str;
            consuming_flag := None;
            false
         end

      | Flag flag ->
         match flag.payload with
         | Unresolved ->
            consuming_flag := Some flag;
            true
         | Absent | Resolved _ -> true
   in
   (* FIXME: This is slow, but Array.filter doesn't exist, I already wrote this, and I am lazy. *)
   st.args <- Array.of_list (List.filter iterator (Array.to_list st.args))

let iter f st =
   resolve_flags st;
   let iterator = function
   | Positional _ -> ()
   | Flag flag ->
      match flag.payload with
      | Absent -> f flag.name None
      | Resolved value -> f flag.name (Some value)
      | Unresolved -> failwith "Unreachable"
   in
   Array.iter iterator st.args

let positionals st =
   let filter = function
   | Positional _ -> true
   | Flag flag ->
      match flag.payload with
      | Absent | Resolved _ -> false
      | Unresolved ->
         flag.payload <- Absent;
         false
   and map = function
   | Positional str -> str
   | Flag _ -> failwith "Unreachable"
   in
   (* FIXME: This is slow, but Array.filter doesn't exist, I already wrote this, and I am lazy. *)
   List.filter filter (Array.to_list st.args) |> List.map map |> Array.of_list
