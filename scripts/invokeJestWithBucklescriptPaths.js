#!/usr/bin/env node

const path = require('path')
const {spawnSync} = require('child_process')

// change ML ext

const newPathArr = process.argv.slice(2)

function pathChanger(arr) {
   return arr
      .map(thePath => path.parse(thePath))
      .filter(pathObj => pathObj.ext === '.ml' || pathObj.ext === '.mli')
      .map(pathObj => {
         pathObj.ext = '.bs.js'
         delete pathObj.base
         return path.format(pathObj)
      })
}

// run jest with .bs.js ext

const newPaths = pathChanger(newPathArr)

const allFlags = ['--bail', '--findRelatedTests', ...newPaths]

spawnSync('jest', allFlags, {stdio: 'inherit'})
