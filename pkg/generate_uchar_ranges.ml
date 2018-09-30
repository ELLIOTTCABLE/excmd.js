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


let get_exn = function
  | Some x -> x
  | None   -> raise (Invalid_argument "Option.get")

let name_of ucd cp =
   let i = Uchar.to_int cp in
   match get_exn (Uucd.cp_prop ucd i Uucd.name) with
   | `Name s -> s
   | `Pattern pat -> pat


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

   mutable vowel_dependents : Uchar.t list;
}

let s : state = {
   curr = Uchar.min;

   transparents = [];
   right_joins = [];
   left_joins = [];

   letters = [];
   viramas = [];
   nonspacings = [];
   non_reordered_nonspacings = [];

   vowel_dependents = [];
}

type entry = Single of Uchar.t | Range of (Uchar.t * Uchar.t)

let collapse (entries : entry list) (cp : Uchar.t) : entry list =
   match entries with
   | Range (a, b) :: rest ->
      if (Uchar.pred a) = cp then
         Range (cp, b) :: rest
      else
         Single cp :: Range (a, b) :: rest

   | Single b :: rest ->
      if (Uchar.pred b) = cp then
         Range (cp, b) :: rest
      else
         Single cp :: Single b :: rest

   | [] -> [Single cp]

let dump_matchers ucd lid chars =
   let is_first = ref true in
   Printf.printf "let %s = [%%sedlex.regexp?\n" lid;
   (List.fold_left collapse [] chars)
   |> (List.iter begin fun entry ->
      if !is_first then begin
         is_first := false;
         print_string "  "
      end else
         print_string "| ";

      match entry with
      | Range (a, b) ->
         Printf.printf "0x%04X .. 0x%04X (* '%s' - '%s' *)\n"
            (Uchar.to_int a) (Uchar.to_int b) (name_of ucd a) (name_of ucd b)
      | Single cp ->
         Printf.printf "0x%04X (* '%s' *)\n" (Uchar.to_int cp) (name_of ucd cp)
   end);
   print_string "]\n\n"

let () =
   if Array.length Sys.argv < 2 then begin
      Printf.eprintf "Please pass the path to ucd.*.grouped.xml as an argument!\n";
      exit 1
   end;

   let path = Sys.argv.(1) in
   let ucd = ucd_or_die path in
   let dump_matchers = dump_matchers ucd in

   try while (s.curr <- Uchar.succ s.curr; true) do
      let i = Uchar.to_int s.curr in

      if (i mod 0x1000) = 0 then Printf.eprintf "\033[2K\rProcessing U+%04X ...%!" i;

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
      and combining_class = get_exn (Uucd.cp_prop ucd i Uucd.canonical_combining_class) in
      begin match (general_category, combining_class) with
      (* General_Category = Letter *)
      | (`Lu, _)
      | (`Ll, _)
      | (`Lt, _)
      | (`Lm, _)
      | (`Lo, _) ->
            s.letters <- (s.curr :: s.letters)

      (* General_Category = Nonspacing_Mark && Canonical_Combining_Class = Not_Reordered *)
      | (`Mn, 0) ->
            s.nonspacings <- (s.curr :: s.nonspacings)

      (* General_Category = Nonspacing_Mark && Canonical_Combining_Class != Not_Reordered *)
      | (`Mn, _) ->
            s.nonspacings <- (s.curr :: s.nonspacings);
            s.non_reordered_nonspacings <- (s.curr :: s.non_reordered_nonspacings)

      (* Canonical_Combining_Class = Virama *)
      | (_, 9) ->
            s.viramas <- (s.curr :: s.viramas)

      | _ -> ()
      end;

      (* UAX #31-R1a, B: http://unicode.org/reports/tr31/#B *)
      begin match get_exn (Uucd.cp_prop ucd i Uucd.indic_syllabic_category) with
      | `Vowel_Dependent ->
            s.vowel_dependents <- (s.curr :: s.vowel_dependents)
      | _ -> ()
      end;


   done with Invalid_argument _ ->
      Printf.eprintf "\n>> Total characters matching each predicate ...\n";
      Printf.eprintf "Joining_Type = Transparent: %i\n" (List.length s.transparents);
      Printf.eprintf "Joining_Type = Right: %i\n" (List.length s.right_joins);
      Printf.eprintf "Joining_Type = Left: %i\n" (List.length s.left_joins);

      Printf.eprintf "General_Category = Letter: %i\n" (List.length s.letters);
      Printf.eprintf "General_Category = Nonspacing_Mark: %i\n" (List.length s.nonspacings);
      Printf.eprintf "General_Category = Nonspacing_Mark, minus CCC=0: %i\n"
         (List.length s.non_reordered_nonspacings);
      Printf.eprintf "Canonical_Combining_Class = Virama: %i\n" (List.length s.viramas);

      Printf.eprintf "Indic_Syllabic_Category = Vowel_Dependent: %i\n"
         (List.length s.vowel_dependents);

      Printf.eprintf "\n>> Printing matching clauses to stdout ...\n";

      dump_matchers "joining_type_transparent" s.transparents;
      dump_matchers "joining_type_right" s.right_joins;
      dump_matchers "joining_type_left" s.left_joins;

      dump_matchers "general_category_letter" s.letters;
      dump_matchers "general_category_nonspacing_mark" s.nonspacings;
      dump_matchers "general_category_nonspacing_mark_minus_not_reordered"
         s.non_reordered_nonspacings;
      dump_matchers "canonical_combining_class_virama" s.viramas;

      dump_matchers "indic_syllabic_category_vowel_dependent" s.vowel_dependents;

