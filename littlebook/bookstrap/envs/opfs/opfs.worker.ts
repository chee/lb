/// <reference lib="webworker" />

import type {
	LbDirEntry,
	LbEnvironment,
	LbFilesystemFileType,
	LbFilesystemStat,
} from "../../bookstrap.ts"

class OPFSHost implements LbEnvironment {
	cwd: LbEnvironment["cwd"]
	env: LbEnvironment["env"]
	systemDirectory: LbEnvironment["systemDirectory"]
	userDirectory: LbEnvironment["userDirectory"]
	protocol: LbEnvironment["protocol"]
	rootHandle: FileSystemDirectoryHandle | null
	inited: boolean
	constructor() {
		this.cwd = "opfs:///"
		this.env = {}
		this.systemDirectory = "opfs:///littlebook/system/"
		this.userDirectory = "opfs:///littlebook/user/"
		this.protocol = "opfs"
		this.rootHandle = null
		this.inited = false
	}

	async init() {
		this.rootHandle = await navigator.storage.getDirectory()
		this.inited = true
	}

	parsePath(path: string | URL) {
		const pathStr = path.toString()
		// Remove opfs:/// prefix if present
		const cleanPath = pathStr.replace(/^opfs:\/+/, "/").replace(/\/+/g, "/")
		if (!cleanPath) return []
		return cleanPath.split("/").filter(segment => segment.length > 0)
	}

	async getDirectoryHandle(pathSegments: string[], create = false) {
		let currentHandle = this.rootHandle

		for (const segment of pathSegments) {
			try {
				currentHandle = await currentHandle!.getDirectoryHandle(segment, {
					create,
				})
			} catch (error) {
				if (error.name === "NotFoundError") {
					throw new Error(`Directory not found: ${pathSegments.join("/")}`)
				}
				throw error
			}
		}

		return currentHandle
	}

	async getFileHandle(
		pathSegments: string[],
		{create}: {create?: boolean} = {}
	) {
		if (pathSegments.length === 0) {
			throw new Error("Cannot get file handle for root directory")
		}

		const dirSegments = pathSegments.slice(0, -1)
		const fileName = pathSegments[pathSegments.length - 1]

		const dirHandle = await this.getDirectoryHandle(dirSegments, create)

		try {
			return await dirHandle!.getFileHandle(fileName, {create})
		} catch (error) {
			if (error.name === "NotFoundError") {
				throw new Error(`File not found: ${pathSegments.join("/")}`)
			}
			throw error
		}
	}

	async rm(path: string) {
		const pathSegments = this.parsePath(path)
		const dirHandle = await this.getDirectoryHandle(pathSegments.slice(0, -1))
		const fileName = pathSegments[pathSegments.length - 1]

		try {
			await dirHandle!.removeEntry(fileName)
		} catch (error) {
			if (error.name === "NotFoundError") {
				throw new Error(`File not found: ${pathSegments.join("/")}`)
			}
			throw error
		}
	}

	async read(path: string) {
		const pathSegments = this.parsePath(path)
		const fileHandle = await this.getFileHandle(pathSegments)
		const file = await fileHandle.getFile()
		const arrayBuffer = await file.arrayBuffer()
		return new Uint8Array(arrayBuffer)
	}

	openFiles = new Set<FileSystemFileHandle>()

	encoder = new TextEncoder()

	async write(
		path: string,
		bytes: Uint8Array | ReadableStream<Uint8Array> | string
	) {
		const pathSegments = this.parsePath(path)
		const fileHandle = await this.getFileHandle(pathSegments, {create: true})
		if (this.openFiles.has(fileHandle)) {
			console.warn(`File already open: ${path}`)
		}
		for (const other of this.openFiles) {
			if (await fileHandle.isSameEntry(other)) {
				console.warn(`File already open: ${path}`)
				return
			}
		}
		if ("createWritable" in fileHandle) {
			const writable = await fileHandle.createWritable()
			if (bytes instanceof Uint8Array) {
				await writable.write(bytes)
			} else if (bytes instanceof ReadableStream) {
				await bytes.pipeTo(writable)
			} else if (typeof bytes == "string") {
				await writable.write(this.encoder.encode(bytes))
			} else {
				throw new TypeError(
					"bad bytes. should be readable stream, Uint8Array or string",
					bytes
				)
			}
			await writable.close()
		}
		this.openFiles.add(fileHandle)
		const access = await fileHandle.createSyncAccessHandle()
		return new Promise<void>(async resolve => {
			access.truncate(0)
			if (bytes instanceof Uint8Array) {
				access.write(bytes)
			} else if (bytes instanceof ReadableStream) {
				for await (const chunk of bytes) {
					access.write(chunk)
				}
			} else if (typeof bytes == "string") {
				access.write(this.encoder.encode(bytes))
			} else {
				throw new TypeError(
					"should be readable stream, Uint8Array or string",
					bytes
				)
			}
			// todo do i need this flush
			access.flush()
			access.close()
			this.openFiles.delete(fileHandle)
			resolve()
		})
	}

	async getFile(path: string) {
		const pathSegments = this.parsePath(path)
		const fileHandle = await this.getFileHandle(pathSegments)
		return await fileHandle.getFile()
	}

	async stream(path: string) {
		const pathSegments = this.parsePath(path)
		const fileHandle = await this.getFileHandle(pathSegments)
		const file = await fileHandle.getFile()
		return file.stream()
	}

	async list(path: string) {
		const pathSegments = this.parsePath(path)
		const dirHandle = await this.getDirectoryHandle(pathSegments)

		const entries = []
		for await (const [name, handle] of dirHandle!.entries()) {
			const type = handle.kind === "file" ? "file" : "directory"
			entries.push({name, type} satisfies LbDirEntry)
		}

		return entries
	}

	async stat(path: string) {
		const pathSegments = this.parsePath(path)

		try {
			const fileHandle = await this.getFileHandle(pathSegments)
			const file = await fileHandle.getFile()
			return {
				size: file.size,
				modified: new Date(file.lastModified),
				type: "file" as LbFilesystemFileType,
				readonly: false,
			} satisfies LbFilesystemStat
		} catch (error) {
			try {
				await this.getDirectoryHandle(pathSegments)
				return {
					size: 0,
					modified: null,
					type: "directory" as LbFilesystemFileType,
					readonly: false,
				}
			} catch (dirError) {
				throw new Error(`Path not found: ${path}`)
			}
		}
	}

	async mkdir(path: string, options: {parents?: boolean} = {}) {
		const pathSegments = this.parsePath(path)

		if (options.parents) {
			await this.getDirectoryHandle(pathSegments, true)
		} else {
			if (pathSegments.length === 0) {
				return
			}
			const parentSegments = pathSegments.slice(0, -1)
			const dirName = pathSegments[pathSegments.length - 1]

			const parentHandle = await this.getDirectoryHandle(parentSegments)
			await parentHandle!.getDirectoryHandle(dirName, {create: true})
		}
	}

	async install() {
		await downloadAndMaterialize("/system.json", "opfs:///littlebook/system")
		await this.mkdir("opfs:///littlebook/user/", {parents: true})
	}

	async uninstall() {
		try {
			console.debug(
				"not implemented. (await navigator.storage.getDirectory()).remove()"
			)
			//await this.rm("opfs:///littlebook/system/", {recursive: true})
		} catch (error) {
			console.error("Failed to uninstall:", error)
		}
	}
}

// Worker message handling
let host = new OPFSHost()

self.onmessage = async function (e) {
	const {id, method, args} = e.data

	try {
		if (!host.inited) {
			await host.init()
		}

		function send(result: any, transfer: Transferable[] = []) {
			self.postMessage({id, result}, {transfer})
		}

		switch (method) {
			case "read":
				const result = await host.read(args[0])
				send(result, [result.buffer])
				break
			case "write":
				send(await host.write(args[0], args[1]))
				break
			case "list":
				send(await host.list(args[0]))
				break
			case "stat":
				send(await host.stat(args[0]))
				break
			case "mkdir":
				send(await host.mkdir(args[0], args[1]))
				break
			case "stream":
				const stream = await host.stream(args[0])
				send(stream, [stream])
				break
			case "props":
				send({
					cwd: host.cwd,
					env: host.env,
					systemDirectory: host.systemDirectory,
					userDirectory: host.userDirectory,
					protocol: host.protocol,
				})
				break
			case "install":
				await host.install()
				send("Installation complete")
				break
			case "uninstall":
				await host.uninstall()
				send("Uninstallation complete")
				break
			case "rm":
				send(await host.rm(args[0]))
				break
			default:
				throw new Error(`unknown method: ${method}`)
		}
	} catch (error) {
		self.postMessage({id, error: error.message})
	}
}

const encoder = new TextEncoder()

/**
 *
 * @param {object} vfs
 * @param {string} targetPath
 */
async function materializeVFS(
	vfs: {directories: string[]; files: {[key: string]: {content: string}}},
	targetPath: string
) {
	try {
		//console.debug(`Materializing Littlebook VFS to ${targetPath}`)
		await host.mkdir(targetPath, {parents: true})

		for (const dirPath of vfs.directories) {
			const fullDirPath = `${targetPath}/${dirPath}`
			//console.debug(`Creating directory: ${fullDirPath}`)
			await host.mkdir(fullDirPath, {parents: true})
		}

		for (const [filePath, fileData] of Object.entries(vfs.files)) {
			const fullFilePath = `${targetPath}/${filePath}`
			const content = encoder.encode(fileData.content)
			//console.debug(`Writing file: ${fullFilePath}`)
			await host.write(fullFilePath, content)
		}
		//console.debug(`Materialized ${targetPath}`)
	} catch (error) {
		console.error(`Failed to materialize VFS`, error)
		throw error
	}
}

/**
 *
 * @param {URL|string} url
 * @param {string} targetPath
 */
async function downloadAndMaterialize(url: URL | string, targetPath: string) {
	try {
		//console.debug(`Downloading VFS from ${url}?`)
		const vfs = await (await fetch(url)).json()
		return materializeVFS(vfs, targetPath)
	} catch (error) {
		console.error(`Failed to download VFS from ${url}:`, error)
		throw error
	}
}
