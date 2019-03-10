#!/usr/bin/env node
// changes path `.ml` or `.mli` to `.bs.js`
// ex: foo.mli -> foo.bs.js

// 1/ change ext (check)
// 2/ run `jest`

const path = require('path')
const {spawnSync} = require('child_process')

// change ext

const pathArr = []

process.argv.forEach(val => {
   pathArr.push(val)
})

const newPathArr = pathArr.slice(2)

function pathChanger(arr) {
   return arr
      .map(thePath => path.parse(thePath))
      .filter(pathObj => pathObj['ext'] === '.ml' || pathObj['ext'] === '.mli')
      .map(pathObj => {
         pathObj.ext = '.bs.js'
         delete pathObj.base
         return path.format(pathObj)
      })
}

// run jest

const newPaths = pathChanger(newPathArr)

const allFlags = ['--bail', '--findRelatedTests', ...newPaths]

spawnSync('jest', allFlags, {stdio: 'inherit'})
