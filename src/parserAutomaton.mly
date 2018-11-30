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

%%
(* {2 Rules } *)

script:
 | xs = optterm_list(break, unterminated_statement); EOF { {statements = xs} }
 ;

statement:
 | x = unterminated_statement; break?; EOF { x }
 ;

unterminated_statement:
 | COLON*; count = COUNT?; cmd = command; args = arguments
 { AST.make_statement ?count ~cmd ~args }
 ;

command:
 | x = IDENTIFIER { x }
 ;

arguments:
 | { [] }
 | xs = nonempty_arguments { xs }
 ;

nonempty_arguments:
 | x = IDENTIFIER { [AST.Positional x] }
 | x = long_flag  { [x] }
 | xs = short_flags  { xs }

 | x = IDENTIFIER; xs = nonempty_arguments { (AST.Positional x) :: xs }
 | x = long_flag;  xs = nonempty_arguments { x :: xs }
 | xs = short_flags; ys = nonempty_arguments { xs @ ys }
 ;

long_flag:
 | name = LONG_FLAG  { AST.Flag {name; payload = AST.Unresolved} }
 | name = LONG_FLAG; EQUALS; payload = IDENTIFIER
 { AST.Flag {name; payload = AST.Resolved payload} }
 ;

short_flags:
 | xs = explode(SHORT_FLAGS)
 { List.map (fun x -> AST.Flag {name = x; payload = AST.Unresolved}) xs }
 ;

break:
 | SEMICOLON { }
 ;

%%
