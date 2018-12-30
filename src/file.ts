import * as fs from './fs-funcs'

export interface File {
  path: string
  content: string
}

export async function getFile(filePath: string): Promise<File> {
  return fs.existsSync(filePath)
    ? { path: filePath, content: await fs.readFile(filePath, 'utf8') }
    : Promise.resolve({ path: filePath, content: '' })
}

export async function writeFile(file: File): Promise<void> {
  return fs.writeFile(file.path, file.content)
}
