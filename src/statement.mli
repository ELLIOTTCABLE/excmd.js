(** Most of these methods take their names from standard OCaml methods over maps. cf. {!Map.Make} *)

(** {2:reso Resolution of ambiguous words } *)
(** It's important to note that a statement is a mutable structure, and that accesses intentionally
  * mutate that structure — in particular, a given word in the original parsed string can only be
  * {e either} a positional argument {e or} the argument to a preceding flag.
  *
  * Any function that accesses either the {e value} of a flag, or accesses the {!positionals} at
  * all, is going to “resolve” that word in the original source. If the word was ambiguously
  * positioned, that will result in the datastructure changing to prevent the word later becoming
  * resolved in an incompatible way.
  *
  * For example: given the following input command as a {!Statement.t},
  *
  * {[
  * hello --where world
  * ]}
  *
  * ... there's two possible ways to interpret the ['world'], chosen between by the order in which
  * you invoke either {!positionals}, or flag-value-reading functions (like {!iter} or
  * {!find}/{!flag}):
  *
  * {[
  * (* Yields zero positionals, and 'world' as the value associated with the flag '--where'. *)
  * let stmt1 = Parser.statement_of_string "hello --where world" in
  * let where = Parser.flag "where" stmt1 (* 'world' *)
  * let xs = Parser.positionals stmt1     (* [] *)
  *
  * (* Yields one positional, 'world', and no value associated with the flag '--where'. *)
  * let stmt2 = Parser.statement_of_string "hello --where world" in
  * let xs = Parser.positionals stmt2     (* ['world'] *)
  * let where = Parser.flag "where" stmt2 (* None *)
  * ]}
  *
  * Once any ambiguous words have been so resolved (or when a function is called that inherently
  * resolves {e all} ambiguous words, such as {!positionals} or {!iter}), a {!Statement.t} is
  * considered “fully resolved.” No functions in this module will further mutate such a [statement].
  *)

type t
(** An alias to {!AST.statement}, abstracted that mutation may be controlled. *)

(** {2 Basic getters } *)

val count : t -> int

val command : t -> string

val mem : string -> t -> bool
(** [mem x stmt] returns [true] if [stmt] contains flag [x], [false] otherwise.
 *
 * Notably, this {e does not} {{!reso} resolve} any unresolved words from the parsed statement. *)

(** {2 Resolvers (mutative getters) } *)

val positionals : t -> string array
(** [positionals stmt] returns a [array] of positional (non-flag) arguments in [stmt].
  *
  * This {{!reso} fully resolves} [stmt] — any ambiguous words will be consumed as positional
  * arguments, becoming unavailable as flag-values. *)

val iter : (string -> string option -> unit) -> t -> unit
(** [iter f stmt] applies [f] to all flags in statement [stmt]. [f] receives the flag as its first
  * argument, and the associated, fully-{{!reso} resolved} value as the second argument.
  *
  * This {{!reso} fully resolves} [stmt] — any ambiguous words will be consumed as the values to
  * their associated flags, becoming unavailable as positional arguments. *)

(** {2 Other helpers } *)

val pp : t -> unit
(** Pretty-print a {{!type:t} statement}. Implementation varies between platforms. *)

val hydrate : t -> AST.statement
(** Type-converter between abstract {!Statement.t} and concrete {!type:AST.statement}.
  *
  * Careful; the operations in this module are intended to maintain safe invariants, consuming
  * components of a [statement] in reasonable ways. You must not devolve one into a raw {!AST} node,
  * modify it unsafely, and then expect to continue to use the functions in this module. *)

val from_script : AST.t-> t array

(**/**)

val dehydrate : AST.statement -> t
