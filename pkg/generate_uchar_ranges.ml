let ucd_or_die inf = begin try
  let ic = if inf = "-" then stdin else open_in inf in
  let d = Uucd.decoder (`Channel ic) in
  match Uucd.decode d with
  | `Ok db -> db
  | `Error e ->
    let (l0, c0), (l1, c1) = Uucd.decoded_range d in
    Printf.eprintf "%s:%d.%d-%d.%d: %s\n%!" inf l0 c0 l1 c1 e;
    exit 1
with Sys_error e -> Printf.eprintf "%s\n%!" e; exit 1
end

let ucd = ucd_or_die "./pkg/ucd.nounihan.grouped.xml"

let get_exn = function
  | Some x -> x
  | None   -> raise (Invalid_argument "Option.get")

(* This is about to get ugly. *)
type state = {
   mutable curr : Uchar.t;

   mutable transparents : Uchar.t list;
   mutable right_joins : Uchar.t list;
   mutable left_joins : Uchar.t list;

   mutable letters : Uchar.t list;
   mutable viramas : Uchar.t list;
   mutable nonspacings : Uchar.t list;
   mutable non_reordered_nonspacings : Uchar.t list;
}

let s = {
   curr = Uchar.max;
   transparents = [];
   right_joins = [];
   left_joins = [];
}


let () =
   try while (s.curr <- Uchar.pred s.curr; true) do
      let i = Uchar.to_int s.curr in

      if (i mod 0x1000) = 0 then Printf.eprintf "U+%04X\n" i;

      (* UAX #31-R1a, A1: http://unicode.org/reports/tr31/#A1 *)
      begin match Uucd.cp_prop ucd i Uucd.joining_type with
      | Some `R ->
            s.right_joins <- (s.curr :: s.right_joins)
      | Some `L ->
            s.left_joins <- (s.curr :: s.left_joins)
      | Some `D ->
            s.right_joins <- (s.curr :: s.right_joins);
            s.left_joins <- (s.curr :: s.left_joins)
      | Some `T ->
            s.transparents <- (s.curr :: s.transparents)
      | Some _
      | None -> ()
      end;

      (* UAX #31-R1a, A2: http://unicode.org/reports/tr31/#A2 *)
      let general_category = get_exn (Uucd.cp_prop ucd i Uucd.general_category)
      and combining_class = Uucd.cp_prop ucd i Uucd.canonical_combining_class in
      begin match (general_category, combining_class) with
      (* General_Category = Letter *)
      | (`Lu, _)
      | (`Ll, _)
      | (`Lt, _)
      | (`Lm, _)
      | (`Lo, _) ->
            s.letters <- (s.curr :: s.letters)

      (* General_Category = Nonspacing_Mark *)
      | (`Mn, _) ->
            s.nonspacings <- (s.curr :: s.nonspacings)

      (* Canonical_Combining_Class = Virama *)
      | (_, 9) ->
            s.viramas <- (s.curr :: s.viramas)

      | Some _
      | None -> ()
      end;


   done with Invalid_argument _ ->
      Printf.eprintf "Joining_Type = Transparent: %i\n" (List.length s.transparents);
      Printf.eprintf "Joining_Type = Left: %i\n" (List.length s.left_joins);
      Printf.eprintf "Joining_Type = : %i\n" (List.length s.right_joins);

      Printf.eprintf "General_Category = Letter: %i\n" (List.length s.letters);

      List.iter (fun cp ->
         Printf.printf "U+%04X\n" (Uchar.to_int cp)
      ) s.transparents
