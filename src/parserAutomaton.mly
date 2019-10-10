(* {2 Tokens } *)
%token COLON
%token <string> COMMENT
%token COMMENT_CLOSE
%token COMMENT_OPEN
%token <string> COUNT
%token EOF
%token EQUALS
%token <int * string> ERR_UNEXPECTED_CHARACTER
%token <string> ERR_UNEXPECTED_WHITESPACE
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

%start <AST.t> script
%start <AST.statement> statement

(* The following type declarations must be updated in accordance with the semantic actions below,
   to satisfy the requirements of Menhir's --inspection API. *)
%type <AST.statement> unterminated_statement
%type <string>       command noncommand_word quotation quotation_chunk flag_long flags_short
%type <string list>  rev_nonempty_quotation rev_subquotation rev_nonempty_subquotation
%type <AST.arg list> arguments nonempty_arguments positional_and_arguments
                        flag_and_arguments
%type <AST.arg>      long_flag_before_positional long_flag_before_flag last_long_flag
%type <AST.arg list> short_flags_before_positional short_flags_before_flag
                        last_short_flags
%type <unit> break


(* These type-clarifications were demanded by the Menhir CLI. Ugly, but whatever. *)
%type <AST.statement list> optterm_nonempty_list(break, unterminated_statement)
                              optterm_list(break, unterminated_statement)
%type <unit option> option(break)
%type <string option> option(COUNT)
%type <unit list> list(COLON)

%{ open AST %}

%%
(* {2 Rules } *)

script:
 | xs = optterm_list(break, unterminated_statement); EOF { {statements = Array.of_list xs} }
 ;

statement:
 | x = unterminated_statement; break?; EOF { x }
 ;

unterminated_statement:
 | COLON*; count = COUNT?; cmd = command; args = arguments
 { make_statement ?count ~cmd ~args }
 ;

command:
 | x = IDENTIFIER { x }
 | x = quotation { x }
 ;

noncommand_word:
 | x = IDENTIFIER { x }
 | hd = URL_START; tl = URL_REST { hd ^ tl }
 | x = quotation { x }
 ;

arguments:
 | { [] }
 | xs = nonempty_arguments { xs }
 ;

nonempty_arguments:
 | xs = positional_and_arguments { xs }
 | xs = flag_and_arguments { xs }
 ;

positional_and_arguments:
 | x = noncommand_word { [Positional x] }
 | x = noncommand_word; xs = nonempty_arguments { (Positional x) :: xs }
 ;

flag_and_arguments:
 | x = last_long_flag  { [x] }
 | xs = last_short_flags  { xs }

 | x = long_flag_before_positional; xs = positional_and_arguments { x :: xs }
 | x = long_flag_before_flag; xs = flag_and_arguments { x :: xs }

 | xs = short_flags_before_positional; ys = positional_and_arguments { xs @ ys }
 | xs = short_flags_before_flag; ys = flag_and_arguments { xs @ ys }
 ;

long_flag_before_positional:
 | name = flag_long  { Flag {name; payload = Unresolved} }
 | name = flag_long; EQUALS; payload = noncommand_word
 { Flag {name; payload = Resolved payload} }
 ;

long_flag_before_flag:
 | x = last_long_flag { x }
 ;

last_long_flag:
 | name = flag_long  { Flag {name; payload = Absent} }
 | name = flag_long; EQUALS; payload = noncommand_word
 { Flag {name; payload = Resolved payload} }
 ;


short_flags_before_positional:
 | xs = explode(flags_short)
 {
   let len = List.length xs in
   xs |> List.mapi (fun i x ->
      Flag {
         name = x;
         payload = if i == (len - 1) then Unresolved else Absent
      }
   )
 }
 ;

short_flags_before_flag:
 | xs = last_short_flags { xs }
 ;

last_short_flags:
 | xs = explode(flags_short)
 { List.map (fun x -> Flag {name = x; payload = Absent}) xs }
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

flag_long:
 | FLAG_LONG_START; x = IDENTIFIER { x }
 ;

flags_short:
 | FLAGS_SHORT_START; x = IDENTIFIER { x }
 ;

break:
 | SEMICOLON { }
 ;

%%
