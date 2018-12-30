import * as fs from 'fs'

export const tempFiles: { [fileName: string]: string } = {}

export const flush = (filePath: string) => {
  for (const fileName in tempFiles) {
    // TODO: write files out actually
    fs.writeFileSync(filePath, tempFiles[fileName])
  }
}
