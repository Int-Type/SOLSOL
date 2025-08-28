import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    host: true
  }
})
