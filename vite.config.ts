import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'replace-cdn-url',
      transform(code, id) {
        if (id.includes('jspdf') && code.includes('https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js')) {
          return {
            code: code.replace('https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js', 'assets/pdfobject.min.js'),
            map: null
          }
        }
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'index.html'),
        capture: path.resolve(__dirname, 'capture.html'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
        content: path.resolve(__dirname, 'src/content/index.ts')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
