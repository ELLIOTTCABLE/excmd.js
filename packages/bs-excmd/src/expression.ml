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
   List.exists is_matching_key expr.rev_args


(* FIXME: This only determines if the _last_ instance of [key] is resolved. Oops. *)
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
   List.exists is_matching_resolved_key expr.rev_args


(* FIXME: This only determines if the _last_ instance of [key] has a payload. Oops. *)
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
   List.exists is_matching_resolved_key_with_payload expr.rev_args


(* FIXME: Jesus Christ. *)
let flag key expr =
   let result = ref None in
   (* Note, because it's confusing: we're "peeking" into the "next" element in a
      *reversed list*; i.e. yes, [prior] is the correct name. *)
   let iterator : arg * arg option -> arg option =
      fun (curr, prior) ->
         match !result with
          | Some _ -> Some curr
          | None -> (
                match prior with
                 (* First position *)
                 | None -> (
                       match curr with
                        | Positional _ -> Some curr
                        | Flag fl ->
                          if key == fl.name then result := Some fl ;
                          Some curr )
                 (* Later positions *)
                 | Some prior -> (
                       match (prior, curr) with
                        (* `--foo bar` *)
                        | Flag ({ payload = Unresolved; _ } as fl), Positional x ->
                          if key == fl.name then (
                             fl.payload <- Resolved x ;
                             result := Some fl ;
                             None )
                          else Some curr
                        (* `prior --current --other` (or `prior --current=val`) *)
                        | _, Flag ({ payload = Resolved _; _ } as fl)
                        | _, Flag ({ payload = Absent; _ } as fl) ->
                          if key == fl.name then result := Some fl ;
                          Some curr
                        | _, Flag { payload = Unresolved; _ }
                        | Flag { payload = Resolved _; _ }, Positional _
                        | Flag { payload = Absent; _ }, Positional _
                        | Positional _, Positional _ -> Some curr ) )
   in
   expr.rev_args <- Gen.(of_list expr.rev_args |> peek |> filter_map iterator |> to_list) ;
   match !result with
    | None -> None
    | Some fl -> (
          match fl.payload with
           | Absent -> Some Empty
           | Resolved str -> Some (Payload str)
           | Unresolved -> failwith "Unreachable" )


let flag_resolving_gen expr =
   let iterator : arg * arg option -> arg option =
      fun (curr, prior) ->
         match (prior, curr) with
          | None, _ | _, Flag _ | Some (Positional _), Positional _ -> Some curr
          | Some (Flag fl), Positional x ->
            fl.payload <- Resolved x ;
            None
   in
   Gen.(of_list expr.rev_args |> peek |> filter_map iterator)


let rev_iteri f expr =
   let iterator i arg =
      match arg with
       | Positional _ -> arg
       | Flag flag -> (
             match flag.payload with
              | Absent ->
                f i flag.name Empty ;
                arg
              | Resolved value ->
                f i flag.name (Payload value) ;
                arg
              | Unresolved -> failwith "Unreachable" )
   in
   expr.rev_args <- Gen.(mapi iterator (flag_resolving_gen expr) |> to_list)


let iteri f expr =
   expr.rev_args <- flag_resolving_gen expr |> Gen.to_list ;
   let iterator i = function
      | Positional _ -> ()
      | Flag flag -> (
            match flag.payload with
             | Absent -> f i flag.name Empty
             | Resolved value -> f i flag.name (Payload value)
             | Unresolved -> failwith "Unreachable" )
   in
   List.rev expr.rev_args |> List.iteri iterator


let iter f expr =
   let f _i a b = f a b in
   iteri f expr


let positionals expr =
   let iterator = function
      | Positional str -> Some str
      | Flag flag -> (
            match flag.payload with
             | Absent | Resolved _ -> None
             | Unresolved ->
               flag.payload <- Absent ;
               None )
   in
   Gen.(of_list expr.rev_args |> filter_map iterator |> to_rev_list)


let positionals_arr expr = positionals expr |> Array.of_list

let flags expr =
   let iterator = function
      | Flag flag -> Some flag.name
      | Positional _ -> None
   in
   Gen.(of_list expr.rev_args |> filter_map iterator |> to_rev_list)


let flags_arr expr = flags expr |> Array.of_list
