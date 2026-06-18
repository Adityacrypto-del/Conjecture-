import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Forward API calls to the Express backend during development.
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
})
