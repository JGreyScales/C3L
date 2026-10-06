import { createApp } from './app'

const port = Number(process.env.PORT) || 3000
const app = await createApp()

try {
  Bun.serve({ port, fetch: app.fetch })
} catch {
  console.error(`\n[C3L] Could not start on port ${port}. Is another copy still running?`)
  console.error('Close it (Ctrl+C in its terminal) or choose another port with the PORT setting.\n')
  process.exit(1)
}

console.log(`\n  C3L is running!  Open  http://localhost:${port}  in your browser.\n`)
