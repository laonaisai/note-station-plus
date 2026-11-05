import { defineConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Transparent proxy middleware for Synology API in Web Browser mode
 * Eliminates browser CORS and private network blocks
 */
function synoProxyPlugin(): Plugin {
  return {
    name: 'syno-api-proxy',
    configureServer(server) {
      server.middlewares.use('/syno-proxy', (req, res) => {
        // Handle preflight CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const targetHeader = req.headers['x-syno-target'] as string;
        const reqUrl = new URL(req.url || '', 'http://localhost');
        const targetHost = targetHeader || reqUrl.searchParams.get('target');

        if (!targetHost) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing target in X-Syno-Target header or ?target=' }));
          return;
        }

        reqUrl.searchParams.delete('target');
        const forwardPath = reqUrl.pathname + reqUrl.search;
        const targetUrl = new URL(forwardPath, targetHost);

        const isHttps = targetUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const headers = { ...req.headers };
        delete headers['host'];
        delete headers['x-syno-target'];
        headers['host'] = targetUrl.host;
        headers['origin'] = targetUrl.origin;
        headers['referer'] = targetUrl.origin + '/';

        const proxyReq = client.request(
          targetUrl,
          {
            method: req.method,
            headers,
            rejectUnauthorized: false
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode || 200;
            for (const [key, value] of Object.entries(proxyRes.headers)) {
              if (key.toLowerCase() !== 'content-security-policy') {
                res.setHeader(key, value as any);
              }
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            proxyRes.pipe(res);
          }
        );

        proxyReq.on('error', (err) => {
          console.error('[syno-proxy error]', err.message);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: `Proxy failed: ${err.message}` }));
        });

        req.pipe(proxyReq);
      });
    }
  };
}

export default defineConfig(() => {
  const isHeadless = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;

  const plugins = [
    synoProxyPlugin(),
    vue(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          if (!isHeadless) {
            options.startup();
          } else {
            console.log('\n💡 [Note Station Plus] 检测到当前处于 Linux 无图形桌面环境 (Headless/No DISPLAY)。');
            console.log('   Web 端已启动，可直接在浏览器或宿主机访问。若需桌面安装包请执行 pnpm build:linux 或 pnpm build:win。\n');
          }
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          if (!isHeadless) {
            options.reload();
          }
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ];

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: true, // Listen on all network interfaces (0.0.0.0)
      port: 5173
    }
  };
});
