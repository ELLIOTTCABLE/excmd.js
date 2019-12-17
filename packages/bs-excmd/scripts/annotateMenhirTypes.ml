(** Given a pair of filenames as command-line arguments, this script will ... FIXME: NYD *)

let linesToAnnotate =
   [| ( "type token ="
      , "\n\
         [@@bs.deriving jsConverter] [@@deriving show { with_path = false }, to_yojson \
         { optional = true }]" )
   |]


(* Why this is missing from [Node.Fs], I can't imagine. *)
external readFileAsBufferSync : string -> Node.buffer = "readFileSync"
[@@bs.val] [@@bs.module "fs"]

external writeFileAsBufferSync : string -> Node.buffer -> unit = "writeFileSync"
[@@bs.val] [@@bs.module "fs"]

external bufferConcat
   :  Node.buffer array
      -> ?length:int
      -> unit
      -> Node.buffer
   = "concat"
   [@@bs.val] [@@bs.scope "Buffer"]

external bufferIndexOf
   :  Node.buffer
      -> string
      -> ?offset:int
      -> ?encoding:
         ([ `ascii | `utf8 | `utf16le | `usc2 | `base64 | `latin1 | `binary | `hex ][@bs.string
          ])
      -> unit
      -> int
   = "indexOf"
   [@@bs.send]

external bufferSlice
   :  Node.buffer
      -> ?start:int
      -> ?end_:int
      -> unit
      -> Node.buffer
   = "slice"
   [@@bs.send]

external bufferLength : Node.buffer -> int = "length" [@@bs.get]

let print_usage () =
   print_endline "\nUsage: `node annotateMenhirTypes.bs.js <source>.ml <dest>.ml`\n"


let src, dest =
   (* Node.Path.resolve, inexplicably, takes *two* strings. *)
   let resolve = Node.Path.resolve "" in
   let args = Js.Array.slice ~start:2 ~end_:5 Sys.argv in
   match args |> Js.Array.map resolve with
    | [| src; dest |] -> (src, dest)
    | _ ->
      print_usage () ;
      Js.Exn.raiseError "need exactly two arguments: a source, and a destination"


(* FIXME: This is going to break, if Menhir starts having any extra whitespace. It *only*
   handles direct bytestring indexing; nothing like regexes or globs ... *)
let prependAfterFirstOccurence ~(input : Node.buffer) ~(matchAfter : string)
      ~(prependBeforeFollowing : string) ~(addition : string)
   =
   let startIndex = bufferIndexOf input matchAfter () in
   string_of_int startIndex |> print_endline ;
   if startIndex == -1 then
      Js.String.concatMany [| "'"; matchAfter; "' not found in input file" |] ""
      |> Js.Exn.raiseError ;
   let followingIndex =
      bufferIndexOf input ~offset:startIndex prependBeforeFollowing ()
   in
   string_of_int followingIndex |> print_endline ;
   if followingIndex == -1 then
      Js.String.concatMany
         [| "'"
          ; prependBeforeFollowing
          ; "' not found following '"
          ; matchAfter
          ; "' in input file"
         |]
         ""
      |> Js.Exn.raiseError ;

   (* Report! *)
   Js.String.concatMany
      [| "Adding annotation ))))e "
       ; string_of_int followingIndex
       ; "( to '"
       ; matchAfter
       ; "' (byte "
       ; string_of_int startIndex
       ; ")"
      |]
      ""
   |> print_endline ;

   (* Okay, have some numbers. Time to start using them to manipulate bytes. *)
   let before = bufferSlice input ~end_:followingIndex () in
   let after = bufferSlice input ~start:followingIndex () in
   let length = bufferLength input + Js.String.length addition in
   bufferConcat [| before; Node.Buffer.fromString addition; after |] ~length ()


let () =
   let contents = readFileAsBufferSync src in
   let pafo input (matchAfter, addition) =
      prependAfterFirstOccurence ~input ~matchAfter ~prependBeforeFollowing:"\n\n"
         ~addition
   in
   let result = linesToAnnotate |> Js.Array.reduce pafo contents in
   writeFileAsBufferSync dest result
