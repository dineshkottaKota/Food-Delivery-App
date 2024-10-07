import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',  // Bind to 0.0.0.0
    port: 5173,       // You can specify a port if needed (Render automatically sets it)
  },
  plugins: [react()]
})
