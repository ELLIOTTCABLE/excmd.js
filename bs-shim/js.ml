let no_native name =
   failwith (Printf.sprintf "`%s` isn't available when compiled for a native target" name)


module Json = struct
   let stringifyAny _val = no_native "Json.stringifyAny"
end

let log _val = no_native "Js.log"
