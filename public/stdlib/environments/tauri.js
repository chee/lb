/**
 * @type {LittlebookFilesystem|null}
 */
export default {
	async read(path) {
		return window.__TAURI__.fs.readFile(path)
	},
	async write(path, data) {
		return window.__TAURI__.fs.writeFile(path, data)
	},
	async stat(path) {
		const stat = await window.__TAURI__.fs.stat(path)
		return {
			...stat,
			type: stat.isDirectory ? "directory" : stat.isSymlink ? "link" : "file",
			modified: stat.mtime,
		}
	},
}
