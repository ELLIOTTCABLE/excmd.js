(* I'm using this file to re-export BuckleScript modules; as of right now, I'm not
   particularly secure in how BS is laying out its components; so I don't want to do
   something like this directly:

   {[ import { nth } from 'bs-platform/lib/es6/list' ]}

   This file allows me to, instead,

   {[ import { nth } from 'src/utils' ]} *)

module StdList = List

module List = struct
   let length = StdList.length

   let nth = StdList.nth
end
