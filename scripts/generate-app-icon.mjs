import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const sourcePath = path.join(rootDir, 'build', 'app-icon.svg')
const outputPath = path.join(rootDir, 'build', 'app-icon.png')

await sharp(sourcePath)
  .resize(512, 512)
  .png()
  .toFile(outputPath)

console.log(`Generated ${outputPath}`)
