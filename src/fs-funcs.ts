import fs from 'fs'
import util from 'util'
import rimraf from 'rimraf'

const promisify = fs.promises
  ? name => fs.promises[name]
  : name => util.promisify(fs[name])

export const readdir: typeof fs.promises.readdir = promisify('readdir')
export const readFile: typeof fs.promises.readFile = promisify('readFile')
export const writeFile: typeof fs.promises.writeFile = promisify('writeFile')
export const remove: util.CustomPromisify<typeof rimraf> = util.promisify(
  rimraf
)

export const existsSync = fs.existsSync
