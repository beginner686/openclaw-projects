import { createBackendApp } from './src/app.js'

const { app, env, stop } = await createBackendApp()

const server = app.listen(env.port, () => {
  console.log(`ClawPilot backend is running at http://localhost:${env.port}`)
})

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received, shutting down backend...`)
  await stop()
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT')
})
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM')
})
