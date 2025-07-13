import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import deno from "@deno/vite-plugin"
import wasm from "vite-plugin-wasm"
import process from "node:process"

const host = process.env.TAURI_DEV_HOST
export default defineConfig({
  plugins: [
    solid(),
    deno(),
    // @ts-expect-error this one is broken
    wasm(),
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
        protocol: "ws",
        host,
        port: 1421,
      }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
})
