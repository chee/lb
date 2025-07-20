import esbuild from "./esbuild.js"
const read = async path => {
	return window.__TAURI__.fs.read
}
