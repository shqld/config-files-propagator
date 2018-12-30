import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import { propagate } from '../src'
import { BackupStorage } from '../src/backup-target'

const sandboxDir = path.resolve('__tests__/sandbox')
const fixtureDir = path.resolve('__tests__/fixture')

const sourceDir = path.join(sandboxDir, 'source')
const actualDir = path.join(sandboxDir, '.')
const backupPath = path.join(sandboxDir, '.backup')

const sourcePath = path.join(sourceDir, '.eslintrc.json')
const actualPath = path.join(actualDir, '.eslintrc.json')

const load = filePath =>
  fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null
// const save = (filePata, data) => fs.writeFileSync(filePata, data)
const loadJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'))
const save = (filePath, obj) =>
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n')

/**
 * A test runner that takes 2 modifiers.
 *
 * This runner always runs main `propagate`
 * and when modifiers are passed,
 * they are run BEFORE propagate
 *
 */
const run = (
  sourceModifier?: (source: any) => void,
  actualModifier?: (actual: any) => void
) => {
  if (sourceModifier) {
    const source = loadJson(sourcePath)
    sourceModifier(source)
    save(sourcePath, source)
  }
  if (actualModifier) {
    const actual = loadJson(actualPath)
    actualModifier(actual)
    save(actualPath, actual)
  }

  return propagate({ sourceDir, actualDir, backupPath })
}

const getResult = () => ({
  backup: loadJson(backupPath),
  source: load(sourcePath),
  actual: load(actualPath),
})

describe('config-sync', () => {
  beforeAll(() => {
    mkdirp.sync(path.join(sandboxDir, 'source'))
    fs.copyFileSync(
      path.join(fixtureDir, '.eslintrc.json'),
      path.join(sourceDir, '.eslintrc.json')
    )
  })

  afterAll(() => {
    rimraf.sync(sandboxDir)
  })

  it('should copy file when no exisiting actual', async () => {
    await run()

    const result = getResult()

    expect(result.backup.files['.eslintrc.json']).toStrictEqual(result.source!)
    expect(result.source).toStrictEqual(result.actual!)
  })

  it('should sync both files when adding', async () => {
    await run(source => {
      source.rules.semi = 'off'
      source.rules.quote = 'warn'
    })

    const result = getResult()

    expect(result.actual).toStrictEqual(result.source!)
    expect(result.backup.files['.eslintrc.json']).toStrictEqual(result.source!)
  })

  it('should sync when both modified on the same line', async () => {
    await run(
      source => {
        source.rules.semi = 'error'
      },
      actual => {
        actual.rules.semi = 'off'
      }
    )

    const result = getResult()

    expect(result.actual).toStrictEqual(result.source!)
    expect(result.backup.files['.eslintrc.json']).toStrictEqual(result.source!)
  })

  it('should conflict when both modified different lines', async () => {
    await run(
      source => {
        source.rules.eqeqeq = 'warn'
      },
      actual => {
        actual.rules.hello = 'off'
      }
    )

    const result = getResult()

    expect(result.actual).toContain('<<<<<<< original')
    expect(result.actual).toContain('>>>>>>> yours')
    expect(result.backup.files['.eslintrc.json']).toStrictEqual(result.source!)
  })
})
