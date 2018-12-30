import * as path from 'path'
import * as fs from './fs-funcs'
import { getFile, writeFile, File } from './file'

interface FileMap {
  [fileName: string]: string
}

export class BackupStorage {
  // hash: string | null
  path: string
  files: FileMap

  constructor(path: string, raw?: { files: FileMap }) {
    this.path = path
    // this.hash = raw.hash || null
    this.files = (raw && raw.files) || {}
  }

  getFileNames() {
    return Object.keys(this.files)
  }

  getFile(fileName): File {
    return {
      path: path.join(this.path, fileName),
      content: this.files[fileName] || '',
    }
  }

  putFile(fileName, file) {
    this.files[fileName] = file
  }

  toString() {
    return JSON.stringify({
      files: this.files,
    })
  }

  static async load(filePath: string): Promise<BackupStorage> {
    if (!fs.existsSync(filePath)) {
      return new this(filePath)
    }

    const rawFile = await fs.readFile(filePath, 'utf8')
    try {
      const obj = JSON.parse(rawFile)
      return new this(filePath, obj)
    } catch (err) {
      throw new Error(`Specified backup file is broken: ${err.message}`)
    }
  }
}
