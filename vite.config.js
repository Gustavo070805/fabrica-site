import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import authHandler from './api/auth.js';
import patientsHandler from './api/patients.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    process.env[k] = v;
  }

  function adaptVercelHandler(handler) {
    return (req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          req.body = body ? JSON.parse(body) : {};
        } catch {
          req.body = body;
        }

        res.status = function (code) {
          this.statusCode = code;
          return this;
        };

        res.json = function (data) {
          if (!this.headersSent) {
            this.setHeader('Content-Type', 'application/json');
          }
          this.end(JSON.stringify(data));
          return this;
        };

        try {
          await handler(req, res);
        } catch (err) {
          console.error('Vite local API middleware error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
          }
        }
      });
    };
  }

  return {
    plugins: [
      react(),
      {
        name: 'local-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/auth', adaptVercelHandler(authHandler));
          server.middlewares.use('/api/patients', adaptVercelHandler(patientsHandler));
        },
      },
    ],
    server: {
      port: 3000,
    },
  };
});
