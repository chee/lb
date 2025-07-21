import type {
	LbDirEntry,
	LbEnvironment,
	LbFilesystemStat,
} from "../../bookstrap.ts"
;(async function () {
	const event = new Event("__lb_env:taurifs")
	if (!window.__TAURI__) {
		window.dispatchEvent(event)
		return
	}
	const tauri = window.__TAURI__

	function fixurl(url: string | URL) {
		if (typeof url === "string") {
			if (!url.startsWith("taurifs:") && !url.startsWith("file:")) {
				url = `taurifs://${url}`
			}
			url = new URL(url)
		}
		if (url.protocol === "taurifs:") {
			url.protocol = "file:"
		}
		return url
	}

	async function read(path: string | URL) {
		return tauri.fs.readFile(fixurl(path))
	}

	async function write(path: string | URL, bytes: Uint8Array) {
		return tauri.fs.writeFile(fixurl(path), bytes)
	}

	async function list(path: string | URL) {
		const entries = await tauri.fs.readDir(fixurl(path))
		return entries.map(
			entry =>
				({
					name: entry.name,
					type: entry.isDirectory
						? "directory"
						: entry.isSymlink
						? "link"
						: "file",
				} satisfies LbDirEntry)
		)
	}

	async function stat(path: string | URL) {
		const stat = await tauri.fs.stat(fixurl(path))
		return {
			size: stat.size,
			modified: stat.mtime,
			type: stat.isDirectory ? "directory" : stat.isSymlink ? "link" : "file",
		} satisfies LbFilesystemStat
	}

	async function mkdir(
		path: string,
		options: {parents: boolean} = {parents: false}
	) {
		return tauri.fs.mkdir(path, {
			recursive: options.parents,
		})
	}

	async function rm(
		path: string | URL,
		options: {recursive?: boolean; force: boolean}
	) {
		try {
			return tauri.fs.remove(path, {
				recursive: options.recursive ?? false,
			})
		} catch (error) {
			if (options.force) {
				return
			}
			throw error
		}
	}

	let [env, cwd, home] = await Promise.all([
		tauri.core.invoke("initial_environment_variables") as Promise<
			Record<string, string>
		>,
		tauri.core.invoke("initial_working_directory") as Promise<URL>,
		tauri.path.homeDir(),
	])
	cwd = new URL(cwd)
	const protocol = "taurifs:"
	home = `${protocol}//${home}`

	cwd.protocol = protocol
	// todo point at the actual source code in dev
	const systemDirectory = `${home}/.local/share/littlebook/`
	const userDirectory = `${home}/.config/littlebook/`

	await tauri.fs.mkdir(userDirectory, {recursive: true})
	const host = {
		protocol,
		read,
		write,
		list,
		stat,
		env,
		cwd,
		mkdir,
		systemDirectory,
		userDirectory,
		rm,
		async install() {
			// todo make noop in dev
			console.log(
				await tauri.core.invoke("install", {
					systemDirectory,
					userDirectory,
				})
			)
		},
		async uninstall() {
			await rm(systemDirectory, {recursive: true, force: true})
		},
	} satisfies LbEnvironment

	window.__lb_env = window.__lb_env || {}
	window.__lb_env.taurifs = host
	window.dispatchEvent(event)
})()
