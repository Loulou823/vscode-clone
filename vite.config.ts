import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['monaco-editor'],
  },
  build: {
    minify: false,
    cssCodeSplit: true,
    
    rollupOptions: {
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'chunks/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/')[1].split('/')
            const pkg = parts[0].startsWith('@') ? `${parts[0]}-${parts[1]}` : parts[0]
            if (pkg === 'monaco-editor') {
              return 'monaco'
            }
            if (pkg === '@xterm/xterm' || pkg === 'xterm' || pkg === '@xterm/addon-fit') {
              return 'xterm'
            }
            if (pkg === 'lucide-vue-next') {
              return 'icons'
            }
            if (pkg === 'vue') {
              return 'vue'
            }
            if (pkg === 'electron') {
              return 'electron'
            }
            return pkg
          }
        },
      },
    },
  },
  plugins: [
    vue(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts',
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer: process.env.NODE_ENV === 'test'
        // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
        ? undefined
        : {},
    }),
  ],
})
