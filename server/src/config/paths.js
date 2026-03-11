import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const paths = {
  serverRoot: path.resolve(__dirname, '..', '..'),
  dataDir: path.resolve(__dirname, '..', '..', 'data'),
  dbFile: path.resolve(__dirname, '..', '..', 'data', 'db.json'),
  reportsDir: path.resolve(__dirname, '..', '..', 'data', 'reports'),
}
