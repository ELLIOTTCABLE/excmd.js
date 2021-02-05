let no_native name =
   failwith (Printf.sprintf "`%s` isn't available when compiled for a native target" name)


module Json = struct
   let stringifyAny _val = no_native "Js.Json.stringifyAny"
end

let log _val = no_native "Js.log"

module Re = struct
   let fromStringWithFlags ~flags str =
      if flags = "" then Str.regexp str
      else if flags = "i" then Str.regexp_case_fold str
      else
         failwith
            (Printf.sprintf "`Js.Re.fromStringWithFlags` can't handle the flags `\"%s\"`."
                  flags)


   let test str regex = Str.string_match regex str 0
end
