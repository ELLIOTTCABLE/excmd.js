(* {2 Tokens } *)
%token COLON
%token <string> COMMENT_CHUNK
%token <string> COMMENT_LINE
%token <string> COUNT
%token EOF
%token EQUALS
%token <string> IDENTIFIER
%token LEFT_COMMENT_DELIM
%token LEFT_PAREN
%token <string> LONG_FLAG
%token PIPE
%token RIGHT_COMMENT_DELIM
%token RIGHT_PAREN
%token SEMICOLON
%token <string> SHORT_FLAGS
%token <string> URL_REST
%token <string> URL_START
(* %token <bool> BOOL *)
(* %token <int> NUM10 *)
(* %token <string> STREL *)

%start <AST.t> script
%start <AST.statement> statement

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
 ;

 noncommand_word:
  | x = IDENTIFIER { x }
  | hd = URL_START; tl = URL_REST { hd ^ tl }
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
 | name = LONG_FLAG  { Flag {name; payload = Unresolved} }
 | name = LONG_FLAG; EQUALS; payload = noncommand_word
 { Flag {name; payload = Resolved payload} }
 ;

long_flag_before_flag:
 | x = last_long_flag { x }
 ;

last_long_flag:
 | name = LONG_FLAG  { Flag {name; payload = Absent} }
 | name = LONG_FLAG; EQUALS; payload = noncommand_word
 { Flag {name; payload = Resolved payload} }
 ;


short_flags_before_positional:
 | xs = explode(SHORT_FLAGS)
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
 | xs = explode(SHORT_FLAGS)
 { List.map (fun x -> Flag {name = x; payload = Absent}) xs }
 ;

break:
 | SEMICOLON { }
 ;

%%
