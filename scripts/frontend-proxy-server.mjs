import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const target = process.env.FRONT_PROXY_TARGET ?? 'http://127.0.0.1:4000'
const port = Number(process.env.FRONT_PROXY_PORT ?? 5173)

const app = express()
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

function isBodyMethod(method) {
  return !['GET', 'HEAD'].includes(String(method).toUpperCase())
}

function sanitizeRequestHeaders(headers) {
  const next = { ...headers }
  delete next.host
  delete next['content-length']
  return next
}

app.use(['/api', '/reports'], async (req, res) => {
  try {
    const url = `${target}${req.originalUrl}`
    const headers = sanitizeRequestHeaders(req.headers)
    const init = {
      method: req.method,
      headers,
    }

    if (isBodyMethod(req.method)) {
      const contentType = String(req.headers['content-type'] ?? '').toLowerCase()
      if (contentType.includes('application/json')) {
        init.body = JSON.stringify(req.body ?? {})
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        init.body = new URLSearchParams(req.body ?? {}).toString()
      } else if (typeof req.body === 'string') {
        init.body = req.body
      }
    }

    const upstream = await fetch(url, init)
    res.status(upstream.status)
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return
      res.setHeader(key, value)
    })
    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.send(buffer)
  } catch (error) {
    console.error('[frontend-proxy-server] request failed:', req.method, req.originalUrl, error?.message ?? error)
    res.status(502).json({
      code: 'UPSTREAM_UNAVAILABLE',
      message: 'Failed to proxy request to backend server.',
    })
  }
})

app.use(express.static(distDir))
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, () => {
  console.log(`[frontend-proxy-server] running on http://127.0.0.1:${port}`)
  console.log(`[frontend-proxy-server] proxy target: ${target}`)
})
