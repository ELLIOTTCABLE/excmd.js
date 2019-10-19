(** Most of these methods take their names from standard OCaml methods over maps. cf.
    {{:https://reasonml.github.io/api/Map.Make.html} [Map.Make]}.

    (An important aspect of the behaviour of this API is the
    {{!reso} resolution of ambiguous words} in parsed commands. See more details at the
    bottom of this file.) *)

type t
(** An alias to {!AST.expression}, abstracted that mutation may be controlled. *)

type flag_payload = Empty | Payload of string

(** {2 Basic getters} *)

(** None of these may mutate the data-structure. *)

val count : t -> int

val command : t -> string

val mem : string -> t -> bool
(** [mem fl expr] returns [true] if [expr] contains flag [fl], [false] otherwise.

    Notably, this {e does not} {{!reso} resolve} any unresolved words from the parsed
    expression. *)

val is_resolved : string -> t -> bool
(** [is_resolved fl expr] returns [true] if [expr] contains flag [fl] {e and} flag [fl]
    is already {{!reso} resolved}; and [false] otherwise. *)

val has_payload : string -> t -> bool
(** [has_payload fl expr] returns [true] if [expr] contains flag [fl], flag [fl] is
    already {{!reso} resolved}, {e and} flag [fl] resolved to a [string] payload instead
    of a [bool]. Returns [false] otherwise. *)

val flags : t -> string array
(** [flags expr] returns a list of the flags used in [expr], including only the {e names}
    of flags - not the payloads. *)

(** {2 Resolvers (mutative getters)} *)

(** All of these may, in some circumstances, mutate the data-structure. *)

val positionals : t -> string array
(** [positionals expr] returns a [array] of positional (non-flag) arguments in [expr].

    This {{!reso} fully resolves} [expr] — any ambiguous words will be consumed as
    positional arguments, becoming unavailable as flag-values. *)

val iter : (string -> flag_payload -> unit) -> t -> unit
(** [iter f expr] applies [f] to all flags in expression [expr]. [f] receives the flag as
    its first argument, and the associated, fully-{{!reso} resolved} value as the second
    argument.

    This {{!reso} fully resolves} [expr] — any ambiguous words will be consumed as the
    values to their associated flags, becoming unavailable as positional arguments. *)

val iteri : (int -> string -> flag_payload -> unit) -> t -> unit

val flag : string -> t -> flag_payload option
(** [flag fl expr] finds the flag by the name of [fl], {{!reso} resolves} it if
    necessary, and produces the payload there of, if any.

    This can yield ...

    - [None], indicating flag [fl] was not present at all.
    - [Some Empty], indicating flag [fl] was present, but resolved to having no payload.
    - [Some (Payload str)], indicating flag [fl] was present and became resolved to the
      payload [str]. This can involve resolution of the word immediately following [fl]. *)

(** {2 Other helpers} *)

val pp : t -> unit
(** Pretty-print a {{!type:t} expression}. Implementation varies between platforms. *)

val hydrate : t -> AST.expression
(** Type-converter between abstract {!Expression.t} and concrete {!type:AST.expression}.

    Careful; the operations in this module are intended to maintain safe invariants,
    consuming components of a [expression] in reasonable ways. You must not devolve one
    into a raw {!AST} node, modify it unsafely, and then expect to continue to use the
    functions in this module. *)

val from_script : AST.t -> t array

val payload_to_opt : flag_payload -> string option
(** Helper to convert a [flag_payload] to a BuckleScript-friendly [option]. *)

(** {2:reso Note: Resolution of ambiguous words}

    It's important to note that a expression is a mutable structure, and that accesses
    intentionally mutate that structure — in particular, a given word in the original
    parsed string can only be {e either} a positional argument {e or} the argument to a
    preceding flag.

    Any function that accesses either the {e value} of a flag, or accesses the
    {!positionals} at all, is going to “resolve” that word in the original source. If
    the word was ambiguously positioned,
    {e that access will result in the datastructure changing} — to prevent the word
    later becoming resolved in an incompatible way.

    For example: given the following input command as a {!Expression.t},

    {[ hello --where world ]}

    ... there's two possible ways to interpret the ['world'], chosen between by the order
    in which you invoke either {!positionals}, or flag-value-reading functions (like
    {!iter} or {!find}/{!flag}):

    {[
       (* FIXME: `flag` doesn't actually work this way ... *)
       (* Yields zero positionals, and 'world' as the value associated with the flag '--where'. *)
       let expr1 = Parser.expression_of_string "hello --where world" in
       let where = Parser.flag "where" expr1 (* 'world' *) in
       let xs = Parser.positionals expr1 (* [] *)

       (* Yields one positional, 'world', and no value associated with the flag '--where'. *)
       let expr2 = Parser.expression_of_string "hello --where world" in
       let xs = Parser.positionals expr2 (* ['world'] *) in
       let where = Parser.flag "where" expr2 (* None *)
    ]}

    Once any ambiguous words have been so resolved (or when a function is called that
    inherently resolves {e all} ambiguous words, such as {!positionals} or {!iter}), a
    {!Expression.t} is considered “fully resolved.” No functions in this module will
    further mutate such a [expression]. *)

(**/**)

val dehydrate : AST.expression -> t
