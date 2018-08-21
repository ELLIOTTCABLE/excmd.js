(* {2 Tokens } *)
%token EOF
%token LEFT_PAREN RIGHT_PAREN
%token LEFT_COMMENT_DELIM RIGHT_COMMENT_DELIM
%token <string> COMMENT_CHUNK
%token <string> COMMENT_LINE
%token <string> IDENTIFIER
(* %token <bool> BOOL *)
(* %token <int> NUM10 *)
(* %token <string> STREL *)

%start <ExcmdAST.t> program

%%
(* {2 Rules } *)

program:
  | it = list(expression); EOF { it }
  ;

expression:
   | LEFT_PAREN; it = identifier; RIGHT_PAREN { (it : ExcmdAST.statement) }
   ;

identifier:
  | it = IDENTIFIER { it }

%%
