import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 18110,
    proxy: {
      '/api': {
        target: 'http://localhost:18100',
        changeOrigin: true,
      },
    },
  },
})
