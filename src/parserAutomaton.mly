(* {2 Tokens } *)
%token BARE_DOUBLE_DASH
%token COLON
%token <string> COMMENT
%token COMMENT_CLOSE
%token COMMENT_OPEN
%token <string> COUNT
%token EOF
%token EQUALS
%token FLAGS_SHORT_START
%token FLAG_LONG_START
%token <string> IDENTIFIER
%token PAREN_CLOSE
%token PAREN_OPEN
%token PIPE
%token <string> QUOTE_CHUNK
%token <string> QUOTE_CLOSE
%token <string> QUOTE_ESCAPE
%token <string> QUOTE_OPEN
%token SEMICOLON
%token <string> URL_REST
%token <string> URL_START
(* %token <bool> BOOL *)
(* %token <int> NUM10 *)
(* %token <string> STREL *)
%token <string> ERR_MISSING_COMMENT_CLOSE
%token <string * string> ERR_MISSING_DELIM_CLOSE
%token <int * string> ERR_UNEXPECTED_CHARACTER
%token <string> ERR_UNEXPECTED_COMMENT_CLOSE
%token <string * string> ERR_UNEXPECTED_QUOTE_CLOSE
%token <string * string> ERR_UNEXPECTED_QUOTE_ESCAPE
%token <string> ERR_UNEXPECTED_WHITESPACE

%start <AST.t> script
%start <AST.expression> expression

(* The following type declarations must be updated in accordance with the semantic actions below,
   to satisfy the requirements of Menhir's --inspection API. *)
%type <AST.expression> unterminated_expression
%type <string>       command noncommand_word _flag_long _flags_short quotation quotation_chunk
%type <string list>  rev_nonempty_quotation rev_subquotation rev_nonempty_subquotation
%type <AST.arg list> rev_arguments rev_arguments_and_flag rev_arguments_and_positional
                        rev_arguments_nonempty short_flags
%type <AST.arg>      long_flag
%type <unit> break


(* These type-clarifications were demanded by the Menhir CLI. Ugly, but whatever. *)
%type <AST.expression list> optterm_nonempty_list(break, unterminated_expression)
                              optterm_list(break, unterminated_expression)
%type <unit option> option(break)
%type <string option> option(COUNT)
%type <unit list> list(COLON)

%{ open AST %}

%%
(* {2 Rules } *)

script:
 | xs = optterm_list(break, unterminated_expression); EOF { {expressions = Array.of_list xs} }
 ;

expression:
 | x = unterminated_expression; break?; EOF { x }
 ;

unterminated_expression:
 | COLON*; count = COUNT?; cmd = command; rev_args = rev_arguments
 { make_expression ?count ~cmd:(Literal cmd) ~rev_args }
 ;

command:
 | x = IDENTIFIER { x }
 | x = quotation { x }
 ;

noncommand_word:
 | x = IDENTIFIER { x }
 | hd = URL_START; tl = URL_REST { hd ^ tl }
 | x = quotation { x }
 | BARE_DOUBLE_DASH { "--" }
 ;

rev_arguments:
 | { [] }
 | xs = rev_arguments_nonempty { xs }
 ;

rev_arguments_nonempty:
 | xs = rev_arguments_and_flag { xs }
 | xs = rev_arguments_and_positional { xs }
 ;

rev_arguments_and_positional:
 | x = noncommand_word { [Positional (Literal x)] }

 | xs = rev_arguments_and_positional; x = noncommand_word { (Positional (Literal x)) :: xs }
 | xs = rev_arguments_and_flag; x = noncommand_word
 {
   let pos = (Positional (Literal x)) in
   match xs with
    | [] -> failwith "unreachable: rev_arguments_and_positional, empty xs"
    | arg :: tl ->
      match arg with
      | Flag { payload = Resolved _; _ } -> pos :: xs
      | Flag ({ payload = Absent; _ } as flag) ->
            pos :: Flag { flag with payload = Unresolved } :: tl
      | Flag { payload = Unresolved; _ } ->
            failwith "unreachable: rev_arguments_and_positional, unresolved"
      | Positional _ -> failwith "unreachable: rev_arguments_and_positional, positional"
 }
 ;

rev_arguments_and_flag:
 | x = long_flag { [x] }
 | xs = short_flags { List.rev xs }

 | xs = rev_arguments_nonempty; x = long_flag; { x :: xs }
 | xs = rev_arguments_nonempty; ys = short_flags { List.rev_append ys xs }
 ;

long_flag:
 | name = _flag_long { Flag {name; payload = Absent} }
 | name = _flag_long; EQUALS; payload = noncommand_word
 { Flag {name; payload = Resolved (Literal payload)} }
 ;

short_flags:
 | xs = explode(_flags_short)
 { List.map (fun x -> Flag {name = x; payload = Absent}) xs }
 ;

_flag_long:
 | FLAG_LONG_START; x = IDENTIFIER { x }
 | FLAG_LONG_START; x = quotation { x }
 ;

_flags_short:
 | FLAGS_SHORT_START; x = IDENTIFIER { x }
 | FLAGS_SHORT_START; x = quotation { x }
 ;

quotation:
 | xs = rev_nonempty_quotation; QUOTE_CLOSE { List.rev xs |> String.concat "" }
 ;

rev_nonempty_quotation:
 | QUOTE_OPEN { [] }
 | xs = rev_nonempty_quotation; x = quotation_chunk { x :: xs }
 | xs = rev_nonempty_quotation; ys = rev_subquotation { ys @ xs }
 ;

(* Subquotation differs from top-level quotation, in that the inner delimiters are included as part
 * of the quoted data. *)
rev_subquotation:
 | xs = rev_nonempty_subquotation; x = QUOTE_CLOSE { x :: xs }
 ;

(* This ... could be more performant. At the moment, it depends on [ys @ xs], which is O(n) in the
 * size of [ys]. A better data-structure may be called for ... but at the data-sizes we're dealing
 * with, this becoming a problem is unlikely. *)
rev_nonempty_subquotation:
 | x = QUOTE_OPEN { [x] }
 | xs = rev_nonempty_subquotation; x = quotation_chunk { x :: xs }
 | xs = rev_nonempty_subquotation; ys = rev_subquotation { ys @ xs }
 ;

quotation_chunk:
 | x = QUOTE_CHUNK { x }
 | x = QUOTE_ESCAPE { x }
 ;

break:
 | SEMICOLON { }
 ;

%%
