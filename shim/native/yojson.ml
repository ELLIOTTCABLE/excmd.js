let no_js name =
   failwith (Printf.sprintf "`%s` isn't available when compiled for a JavaScript target" name)

module Safe = struct
   type json = [ `Assoc of (string * json) list
       | `Bool of bool
       | `Float of float
       | `Int of int
       | `Intlit of string
       | `List of json list
       | `Null
       | `String of string
       | `Tuple of json list
       | `Variant of string * json option ]

   let pretty_print (_out : Format.formatter) (_json : json) =
      no_js "Yojson.Safe.pretty_print"
end
