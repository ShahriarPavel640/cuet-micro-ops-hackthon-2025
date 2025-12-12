import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    mainFields: ['module', 'main', 'jsnext:main', 'jsnext'],
  },
  server: {
    port: 5173,
    host: true
  }
})
