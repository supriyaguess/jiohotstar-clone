import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin /api in dev, so the refresh cookie works without CORS setup.
    proxy: { '/api': 'http://localhost:4000' },
  },
})
