open AST

type t = expression

type flag_payload = Empty | Payload of string AST.or_subexpr

let hydrate expr = expr

let dehydrate expr = expr

let from_script scpt = scpt.expressions

let pp expr = AST.pp_expression expr

let count expr = expr.count

let command expr = expr.cmd

let payload_to_opt = function
   | Empty -> None
   | Payload str -> Some str


(* These are a mess of mutating code instead of simple, functional iteration, mostly because this
 * library is targeting JavaScript, at the end of the day. This is all wrapped in a JavaScript class
 * that appears to wrap a mutable parse-result; so it might as well be *actually* mutable, no? *)

let mem key expr =
   let is_matching_key = function
      | Positional _ -> false
      | Flag f -> f.name == key
   in
   (* FIXME: This is slow, but Array.exists isn't available until OCaml 4.03, and I am
      lazy. *)
   List.exists is_matching_key (Array.to_list expr.args)


let is_resolved key expr =
   let is_matching_resolved_key = function
      | Positional _ -> false
      | Flag f -> (
            if f.name != key then false
            else
            match f.payload with
             | Unresolved -> false
             | Resolved _ | Absent -> true )
   in
   (* FIXME: This is slow, but Array.exists isn't available until OCaml 4.03, and I am
      lazy. *)
   List.exists is_matching_resolved_key (Array.to_list expr.args)


let has_payload key expr =
   let is_matching_resolved_key_with_payload = function
      | Positional _ -> false
      | Flag f -> (
            if f.name != key then false
            else
            match f.payload with
             | Unresolved | Absent -> false
             | Resolved _ -> true )
   in
   (* FIXME: This is slow, but Array.exists isn't available until OCaml 4.03, and I am
      lazy. *)
   List.exists is_matching_resolved_key_with_payload (Array.to_list expr.args)


(* FIXME: Jesus Christ. *)
let flag key expr =
   let consuming_flag = ref None in
   let result = ref None in
   let iterator arg =
      match !result with
       | Some _ -> true
       | None -> (
             match arg with
              | Positional str -> (
                    match !consuming_flag with
                     | None -> true
                     | Some fl ->
                       fl.payload <- Resolved str ;
                       result := Some fl ;
                       consuming_flag := None ;
                       false )
              | Flag flag -> (
                    if flag.name != key then true
                    else
                    match flag.payload with
                     | Unresolved ->
                       consuming_flag := Some flag ;
                       true
                     | Absent | Resolved _ ->
                       result := Some flag ;
                       true ) )
   in
   (* FIXME: This is slow, but Array.filter doesn't exist, I already wrote this, and I am
      lazy. *)
   expr.args <- Array.of_list (List.filter iterator (Array.to_list expr.args)) ;
   match !result with
    | None -> None
    | Some fl -> (
          match fl.payload with
           | Absent -> Some Empty
           | Resolved str -> Some (Payload str)
           | Unresolved -> failwith "Unreachable" )


let resolve_all_flags expr =
   let consuming_flag = ref None in
   let iterator arg =
      match arg with
       | Positional str -> (
             match !consuming_flag with
              | None -> true
              | Some fl ->
                fl.payload <- Resolved str ;
                consuming_flag := None ;
                false )
       | Flag flag -> (
             match flag.payload with
              | Unresolved ->
                consuming_flag := Some flag ;
                true
              | Absent | Resolved _ -> true )
   in
   (* FIXME: This is slow, but Array.filter doesn't exist, I already wrote this, and I am
      lazy. *)
   expr.args <- Array.of_list (List.filter iterator (Array.to_list expr.args))


let iteri f expr =
   resolve_all_flags expr ;
   let iterator i = function
      | Positional _ -> ()
      | Flag flag -> (
            match flag.payload with
             | Absent -> f i flag.name Empty
             | Resolved value -> f i flag.name (Payload value)
             | Unresolved -> failwith "Unreachable" )
   in
   Array.iteri iterator expr.args


let iter f expr =
   let f _i a b = f a b in
   iteri f expr


let positionals expr =
   let filter = function
      | Positional _ -> true
      | Flag flag -> (
            match flag.payload with
             | Absent | Resolved _ -> false
             | Unresolved ->
               flag.payload <- Absent ;
               false )
   and map = function
      | Positional str -> str
      | Flag _ -> failwith "Unreachable"
   in
   (* FIXME: This is slow, but Array.filter doesn't exist, I already wrote this, and I am
      lazy. *)
   List.filter filter (Array.to_list expr.args) |> List.map map |> Array.of_list


let flags expr =
   let filter = function
      | Flag _flag -> true
      | Positional _ -> false
   and map = function
      | Flag flag -> flag.name
      | Positional _ -> failwith "Unreachable"
   in
   (* FIXME: This is slow, but Array.filter doesn't exist, I already wrote this, and I am
      lazy. *)
   List.filter filter (Array.to_list expr.args) |> List.map map |> Array.of_list
