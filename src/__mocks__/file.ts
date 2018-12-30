import { tempFiles } from '../../__tests__/helper/temp-files'
import { File } from '../file'

export async function getFile(filePath: string): Promise<File> {
  return {
    path: filePath,
    content: tempFiles[filePath],
  }
}

export async function writeFile(file: File): Promise<void> {
  tempFiles[file.path] = file.content
  return
}
