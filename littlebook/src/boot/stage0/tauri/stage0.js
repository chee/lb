;(async function () {
	const tauri = window.__TAURI__
	/**
	 *
	 * @param {string|URL} path
	 * @returns
	 */
	async function read(path) {
		return tauri.fs.readFile(path)
	}

	/**
	 * @param {string|URL} path
	 * @param {Uint8Array} bytes
	 * @returns
	 */
	async function write(path, bytes) {
		return tauri.fs.writeFile(path, bytes)
	}

	/**
	 * @param {string|URL} path
	 * @returns
	 */
	async function list(path) {
		const entries = await tauri.fs.readDir(path)
		return entries.map(entry => ({
			name: entry.name,
			type: /** @type {LittlebookHostFileType} */ (
				entry.isDirectory ? "directory" : entry.isSymlink ? "link" : "file"
			),
		}))
	}

	/**
	 * @param {string|URL} path
	 * @returns
	 */
	async function stat(path) {
		const stat = await tauri.fs.stat(path)
		return {
			size: stat.size,
			modified: stat.mtime,
			type: /** @type {LittlebookHostFileType} */ (
				stat.isDirectory ? "directory" : stat.isSymlink ? "link" : "file"
			),
		}
	}

	/**
	 *
	 * @param {string} path
	 * @param {{parents: boolean}} options
	 * @returns
	 */
	async function mkdir(path, options = {parents: false}) {
		return tauri.fs.mkdir(path, {
			recursive: options.parents,
		})
	}

	const env = await tauri.core.invoke("initial_environment_variables")
	const cwd = await tauri.core.invoke("initial_working_directory")

	const home = await tauri.path.homeDir()
	// todo recursively copy the system folder here if it doesn't exist
	// also perhaps stage0/host should add an `install` command to be called
	// during stage1
	const systemDirectory =
		(await tauri.path.join(home, ".local", "share", "littlebook")) + "/"
	// todo create a init.ts
	const userDirectory =
		(await tauri.path.join(home, ".config", "littlebook")) + "/"
	// interesting... now that we are in a non-module context we could update the import map
	// by reading a userDirectory importmap.json!
	await tauri.fs.mkdir(userDirectory, {recursive: true})
	try {
		const importmap = await tauri.fs.readTextFile(
			await tauri.path.join(userDirectory, "importmap.json")
		)
		if (importmap) {
			document.head.appendChild(
				Object.assign(document.createElement("script"), {
					type: "importmap",
					innerHTML: importmap,
				})
			)
		}
	} catch {}

	async function install() {}

	// todo type this in littlebook. a Host is an important thing
	const host = {
		read,
		write,
		list,
		stat,
		env,
		cwd,
		mkdir,
		systemDirectory,
		userDirectory,
		protocol: "file:",
	}

	const script = await read(
		await tauri.path.join(systemDirectory, "boot", "stage1", "stage1.js")
	)
	const blob = new Blob([script], {type: "text/javascript"})
	const url = URL.createObjectURL(blob)
	const scriptElement = document.createElement("script")
	scriptElement.src = url
	window.addEventListener(
		"__littlebootstrap",
		async () => {
			await window.__littlebootstrap(host)
		},
		{once: true}
	)
	document.head.appendChild(scriptElement)
})()
