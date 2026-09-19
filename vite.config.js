// CommonJS (package.json a "type":"commonjs") pour éviter l'avertissement
// « ESM syntax in a file loaded as CommonJS » du configLoader natif de Vite.
const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En dev, les Netlify Functions tournent via `netlify dev` (port 8888).
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
