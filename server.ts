import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

const app = express();
const PORT = 3000;
const TARGET_API_BASE = 'https://galo.prodental.dev/API/api';

app.use(cors());
app.use(express.json());

// Proxy /API/api and /api requests to https://galo.prodental.dev/API/api
app.use(['/API/api', '/api'], async (req, res) => {
  try {
    const targetUrl = `${TARGET_API_BASE}${req.url}`;

    const headers: Record<string, string> = {
      'accept': 'application/json',
    };
    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization as string;
    }
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'] as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || 'application/json';

    res.status(response.status);
    res.setHeader('content-type', contentType);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('API proxy error:', err);
    res.status(502).json({ error: 'Proxy request failed', details: err?.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
