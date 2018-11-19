(* {2 Tokens } *)
%token EOF
%token COLON PIPE SEMICOLON
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
 | it = optterm_list(break, statement); EOF { { statements = it } }
 ;

statement:
 | COLON*; count = COUNT?; cmd = command { AST.make_statement ?count ~cmd }
 ;

command:
 | it = IDENTIFIER { it }
 ;

break:
 | SEMICOLON { }
 ;

%%
