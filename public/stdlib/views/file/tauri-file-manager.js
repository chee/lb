//const log = lb.logger.extend("file-editor")

/**
 *
 * @param {URL} url
 * @returns
 */
export async function readFile(url) {
	const bytes = await window.__TAURI__.fs.readFile(url)
	return {
		bytes,
		async save(newBytes) {
			await window.__TAURI__.fs.writeFile(url, newBytes)
		},
	}
}
