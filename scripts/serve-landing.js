const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.LANDING_PORT || 8080
const ROOT = path.resolve(__dirname, '..')
const NEXT_TARGET_HOST = process.env.NEXT_TARGET_HOST || 'localhost'
const NEXT_TARGET_PORT = Number(process.env.NEXT_TARGET_PORT || 3000)

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

function send(res, statusCode, body, contentType = 'text/plain; charset=UTF-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType })
  res.end(body)
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0])
  const requested = cleanPath === '/' ? '/index.html' : cleanPath
  const absolute = path.normalize(path.join(ROOT, requested))

  if (!absolute.startsWith(ROOT)) {
    return null
  }

  return absolute
}

function shouldProxyToNext(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || '/').split('?')[0])

  if (cleanPath.startsWith('/_next')) {
    return true
  }

  // Don't proxy static HTML files
  if (cleanPath.endsWith('.html') || cleanPath.endsWith('.css') || cleanPath.endsWith('.js')) {
    return false
  }

  return (
    cleanPath.startsWith('/become-a-host') ||
    cleanPath.startsWith('/volunteer') ||
    cleanPath.startsWith('/host/')
  )
}

function proxyToNext(req, res) {
  const options = {
    hostname: NEXT_TARGET_HOST,
    port: NEXT_TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${NEXT_TARGET_HOST}:${NEXT_TARGET_PORT}`,
    },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('error', () => {
    send(res, 502, 'Next.js app is unavailable. Start the client server and try again.')
  })

  req.pipe(proxyReq, { end: true })
}

const server = http.createServer((req, res) => {
  if (shouldProxyToNext(req.url)) {
    proxyToNext(req, res)
    return
  }

  const filePath = resolvePath(req.url || '/')

  if (!filePath) {
    send(res, 403, 'Forbidden')
    return
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      send(res, 404, 'Not Found')
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 500, 'Internal Server Error')
        return
      }

      send(res, 200, data, contentType)
    })
  })
})

server.listen(PORT, () => {
  console.log(`Landing page running at http://localhost:${PORT}`)
})
