(* {2 Tokens } *)
%token EOF
%token COLON PIPE SEMICOLON EQUALS
%token <string> COUNT
%token LEFT_PAREN RIGHT_PAREN
%token LEFT_COMMENT_DELIM RIGHT_COMMENT_DELIM
%token <string> COMMENT_CHUNK
%token <string> COMMENT_LINE
%token <string> IDENTIFIER
%token <string> SHORT_FLAGS
%token <string> LONG_FLAG
(* %token <bool> BOOL *)
(* %token <int> NUM10 *)
(* %token <string> STREL *)

%start <AST.t> script
%start <AST.statement> statement

%{ open AST %}

%%
(* {2 Rules } *)

script:
 | xs = optterm_list(break, located_statement); EOF { {statements = xs} }
 ;

statement:
 | x = unterminated_statement; break?; EOF { x }
 ;

located_statement:
 | x = unterminated_statement { x |> node $loc }
 ;

unterminated_statement:
 | COLON*; count = count?; cmd = bareword; args = arguments
 { AST.make_statement ?count ~cmd ~args }
 ;

count:
 | count = COUNT { count |> node $loc }
 ;

bareword:
 | x = IDENTIFIER { x |> node $loc }
 ;

arguments:
 | { [] }
 | xs = nonempty_arguments { xs }
 ;

nonempty_arguments:
 | x = IDENTIFIER { [AST.Positional x |> node $loc] }
 | x = long_flag  { [x] }
 | xs = short_flags  { xs }

 | x = IDENTIFIER; xs = nonempty_arguments { (AST.Positional x |> node $loc) :: xs }
 | x = long_flag;  xs = nonempty_arguments { x :: xs }
 | xs = short_flags; ys = nonempty_arguments { xs @ ys }
 ;

long_flag:
 | name = LONG_FLAG
 { AST.Flag {name = name |> node $loc(name); payload = AST.Unresolved} |> node $loc }

 | name = LONG_FLAG; EQUALS; payload = bareword
 { AST.Flag {name = name |> node $loc(name); payload = AST.Resolved payload} |> node $loc }
 ;

short_flags:
 | flags = explode(SHORT_FLAGS)
 { AST.make_short_flags ~flags ~loc:$loc }
 ;

break:
 | SEMICOLON { }
 ;

%%
