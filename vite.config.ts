import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig(() => {
  const isHeadless = process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY;

  const plugins = [
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
      host: true, // Listen on all addresses (0.0.0.0) so user can access from local network or browser
      port: 5173
    }
  };
});
