import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@react-pdf') || id.includes('node_modules/pdfkit') || id.includes('node_modules/fontkit') || id.includes('node_modules/png-js') || id.includes('node_modules/yoga-layout')) {
            return 'pdf-vendor'
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-vendor'
          }
        }
      }
    }
  }
})
