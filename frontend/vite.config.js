import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Middleware to protect admin routes at the server level (HTTP 302 redirect even with JS disabled)
function authMiddlewarePlugin() {
  const protectedRoutes = [
    '/dashboard',
    '/add-certificate',
    '/edit-certificate',
    '/certificate',
    '/certificates'
  ];

  const handleAuth = (req, res, next) => {
    const url = req.url ? req.url.split('?')[0] : '';
    const isProtected = protectedRoutes.some(
      (route) => url === route || url.startsWith(route + '/')
    );

    if (isProtected) {
      const cookieHeader = req.headers.cookie || '';
      const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
      const token = match ? match[1] : null;

      if (!token) {
        // HTTP 302 redirect to login page - handled by browser networking, works with JS disabled
        res.writeHead(302, { Location: '/' });
        return res.end();
      }
    }
    next();
  };

  return {
    name: 'auth-middleware',
    configureServer(server) {
      server.middlewares.use(handleAuth);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleAuth);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    authMiddlewarePlugin(),
  ],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'https://certificatesystembackend-production-4846.up.railway.app',
        changeOrigin: true,
      },
    },
  },
})
