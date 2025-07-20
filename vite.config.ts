import {defineConfig} from "vite"
import paths from "vite-tsconfig-paths"
import importMapPlugin from "@titovdima/vite-plugin-import-map"

export default defineConfig({
	build: {
		outDir: "dist/tauri",
	},
	plugins: [paths()],
	server: {
		port: 2025,
	},
})
