import os from 'os'
import path from 'path'
import * as diff from 'diff'

import * as fs from './fs-funcs'
import { BackupStorage } from './backup-target'
import { getFile, writeFile, File } from './file'

// Aggressively determine line delimiter by os.EOL
const LINE_DELIMITER = os.EOL

const isConflicted = file =>
  /<<<<<<< original/.test(file) && />>>>>>> yours/.test(file)

export async function propagate({
  sourceDir,
  actualDir,
  backupPath,
  ...options
}) {
  const [sourceFileNames, backup] = await Promise.all([
    fs.readdir(sourceDir),
    BackupStorage.load(backupPath),
  ])

  let tasks: Array<Promise<any>> = []

  for (const fileName of sourceFileNames) {
    tasks.push(
      syncFile({
        fileName,
        sourcePath: path.join(sourceDir, fileName),
        actualPath: path.join(actualDir, fileName),
        backup,
      })
    )
  }

  await Promise.all(tasks)
  tasks = []

  for (const fileName of backup.getFileNames()) {
    if (!sourceFileNames.includes(fileName)) {
      tasks.push(fs.remove(path.join(actualDir, fileName)))
    }
  }

  await Promise.all(tasks)

  try {
    await Promise.all(tasks)
  } catch (err) {
    if (err instanceof CFPError) {
      console.warn(err.message, ':', err.source)
      return
    }

    console.warn(err)
  }

  await fs.writeFile(backupPath, backup)
}

export async function syncFile({
  fileName,
  sourcePath,
  actualPath,
  backup,
}): Promise<void> {
  const [source, actual] = await Promise.all([
    getFile(sourcePath),
    getFile(actualPath),
  ])

  const backupFile = backup.getFile(fileName)
  backup.putFile(fileName, source.content)

  const file = applyChangesToFile({
    fileName,
    source,
    actual,
    backup: backupFile,
  })

  return fs.writeFile(actualPath, file)
}

class CFPError extends Error {
  code: string
  source: string

  constructor({ code, message, source }) {
    super(message)
    this.code = code
    this.source = source
  }
}

export function applyChangesToFile({
  fileName,
  source,
  actual,
  backup,
}: {
  fileName: string
  source: File
  actual: File
  backup: File
}): string {
  if (source.content === backup.content) {
    return actual.content
  }

  if (!actual.content) {
    return source.content
  }

  if (isConflicted(actual.content)) {
    throw new CFPError({
      code: 'FILE_HAS_CONFLICTS',
      message: 'File has conflicts already',
      source: source.path,
    })
  }

  const minePatch = diff.createPatch(fileName, backup.content, source.content)
  const theirPatch = diff.createPatch(fileName, backup.content, actual.content)

  return resolveMerged(diff.merge(minePatch, theirPatch, backup.content))
}

interface MergedPatch {
  hunks: Array<{
    lines: Array<
      | string
      | {
          conflict: boolean
          mine: Array<string>
          theirs: Array<String>
        }
    >
  }>
}

export function resolveMerged(mergedPatch: MergedPatch): string {
  return mergedPatch.hunks
    .map(hunk =>
      hunk.lines.reduce((acc, line) => {
        if (typeof line === 'string') {
          if (line.startsWith('-')) return acc

          acc += line.slice(1) + LINE_DELIMITER
          return acc
        }

        if (line.conflict) {
          const lines = [
            '<<<<<<< original',
            line.mine
              .filter(l => l.startsWith('+'))
              .map(l => l.slice(1))
              .join(LINE_DELIMITER),
            '=======',
            line.theirs
              .filter(l => l.startsWith('+'))
              .map(l => l.slice(1))
              .join(LINE_DELIMITER),
            '>>>>>>> yours',
          ].join(LINE_DELIMITER)

          acc += lines + LINE_DELIMITER
        }

        return acc
      }, '')
    )
    .join(LINE_DELIMITER)
}
