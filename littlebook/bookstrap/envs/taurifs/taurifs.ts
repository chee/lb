import type {
	LbDirEntry,
	LbEnvironment,
	LbFilesystemStat,
} from "../../bookstrap.ts"
;(async function () {
	const event = new Event("__lb.env:taurifs")
	if (!self.__TAURI__) {
		self.dispatchEvent(event)
		return
	}
	const tauri = self.__TAURI__

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

	const encoder = new TextEncoder()
	async function write(
		path: string | URL,
		bytes: Uint8Array | ReadableStream<Uint8Array> | string
		// todo options of encoding?
	) {
		if (typeof bytes === "string") {
			bytes = encoder.encode(bytes)
		}
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
				}) satisfies LbDirEntry
		)
	}

	async function stat(path: string | URL) {
		const stat = await tauri.fs.stat(fixurl(path))
		return {
			size: stat.size,
			modified: stat.mtime,
			type: stat.isDirectory ? "directory" : stat.isSymlink ? "link" : "file",
			readonly: stat.readonly,
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
	const protocol = "taurifs"
	home = `${protocol}://${home}`

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
		// todo is this really part of the fs?
		async install() {
			// todo make noop in dev
			await tauri.core.invoke("install", {
				systemDirectory,
				userDirectory,
			})
		},
		async uninstall() {
			await rm(systemDirectory, {recursive: true, force: true})
		},
		async stream(path: string | URL) {
			const chunkSize = 64 * 1024
			let cursor = 0
			let fileHandle: InstanceType<typeof tauri.fs.FileHandle> | null = null
			return new ReadableStream({
				async start() {
					try {
						fileHandle = await tauri.fs.open(path, {read: true})
					} catch (error) {
						throw new DOMException(
							`Failed to open file for streaming: ${error}`,
							"NotReadableError"
						)
					}
				},
				async pull(controller) {
					try {
						const buffer = new Uint8Array(chunkSize)
						await fileHandle!.seek(cursor, tauri.fs.SeekMode.Start)
						const bytesRead = await fileHandle!.read(buffer)
						if (bytesRead === 0 || bytesRead === null) {
							controller.close()
							return
						}
						const chunk = buffer.slice(0, bytesRead)
						controller.enqueue(chunk)
						cursor += bytesRead
					} catch (error) {
						controller.error(
							new DOMException(
								`Stream read error: ${error}`,
								"NotReadableError"
							)
						)
						fileHandle?.close()
					}
				},
				async cancel() {
					try {
						await fileHandle!.close()
					} catch {}
				},
			})
		},
	} satisfies LbEnvironment

	self.__lb.env = self.__lb.env || {}
	self.__lb.env.taurifs = host
	self.dispatchEvent(event)
})()
