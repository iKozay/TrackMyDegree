import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: true,
  },
  server: {
    host: "0.0.0.0", // Listen on all network interfaces
    port: 5173, // Ensure this matches your Docker EXPOSE
    strictPort: true, // Fail if the port is already in use
    hmr: {
      clientPort: 5173, // Ensures HMR connects to the correct port on your host
    },
  },
});
