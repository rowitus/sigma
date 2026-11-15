import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Requests to /api and /health go to the Python backend during development.
// The backend runs on port 8010.
const BACKEND = "http://127.0.0.1:8010";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // fail loudly instead of silently moving to another port
    proxy: {
      "/api": BACKEND,
      "/health": BACKEND,
    },
  },
});
