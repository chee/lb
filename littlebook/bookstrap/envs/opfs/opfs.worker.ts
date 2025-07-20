/// <reference lib="webworker" />

import type {LbEnvironment} from "../../bookstrap.ts"

export interface OPFSWorkerMessageMap {
	read: [string, Uint8Array]
	write: [string, Uint8Array]
	list: [string, {name: string; type: "file" | "directory"}]
	stat: [
		string,
		{size: number; modified: Date | null; type: "file" | "directory"}
	]
	mkdir: [string, {parents?: boolean}]
	props: [
		string,
		{
			cwd: string
			env: Record<string, string>
			systemDirectory: string
			userDirectory: string
			protocol: string
		}
	]
	install: []
	uninstall: []
	rm: [string, {recursive?: boolean; force?: boolean}]
}
/**
 * @implements {}
 */
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
		this.protocol = "opfs:"
		this.rootHandle = null
		this.inited = false
	}

	async init() {
		this.rootHandle = await navigator.storage.getDirectory()
		this.inited = true
	}

	/**
	 *
	 * @param {string} path
	 * @returns
	 */
	parsePath(path) {
		const pathStr = path.toString()
		// Remove opfs:/// prefix if present
		const cleanPath = pathStr.replace(/^opfs:\/+/, "/").replace(/\/+/g, "/")
		if (!cleanPath) return []
		return cleanPath.split("/").filter(segment => segment.length > 0)
	}

	async getDirectoryHandle(pathSegments, create = false) {
		let currentHandle = this.rootHandle

		for (const segment of pathSegments) {
			try {
				currentHandle = await currentHandle.getDirectoryHandle(segment, {
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

	/**
	 *
	 * @param {string[]} pathSegments
	 * @param {boolean} create
	 * @returns
	 */
	async getFileHandle(pathSegments, create = false) {
		if (pathSegments.length === 0) {
			throw new Error("Cannot get file handle for root directory")
		}

		const dirSegments = pathSegments.slice(0, -1)
		const fileName = pathSegments[pathSegments.length - 1]

		const dirHandle = await this.getDirectoryHandle(dirSegments, create)

		try {
			return await dirHandle.getFileHandle(fileName, {create})
		} catch (error) {
			if (error.name === "NotFoundError") {
				throw new Error(`File not found: ${pathSegments.join("/")}`)
			}
			throw error
		}
	}

	/**
	 *
	 * @param {string} path
	 * @returns
	 */
	async read(path) {
		const pathSegments = this.parsePath(path)
		const fileHandle = await this.getFileHandle(pathSegments)
		const file = await fileHandle.getFile()
		const arrayBuffer = await file.arrayBuffer()
		return new Uint8Array(arrayBuffer)
	}

	open = new Set<FileSystemFileHandle>()

	/**
	 *
	 * @param {string} path
	 * @param {Uint8Array} bytes
	 */
	async write(path, bytes) {
		const pathSegments = this.parsePath(path)
		const fileHandle = await this.getFileHandle(pathSegments, true)
		if (this.open.has(fileHandle)) {
			console.warn(`File already open: ${path}`)
		}
		for (const other of this.open) {
			if (fileHandle.isSameEntry(other)) {
				console.warn(`File already open: ${path}`)
				return
			}
		}
		this.open.add(fileHandle)

		const access = await fileHandle.createSyncAccessHandle()
		return new Promise<void>(resolve => {
			access.truncate(0)
			access.write(bytes)
			access.close()
			this.open.delete(fileHandle)
			resolve()
		})
	}

	/**
	 * @param {string} path
	 */
	async list(path) {
		const pathSegments = this.parsePath(path)
		const dirHandle = await this.getDirectoryHandle(pathSegments)

		const entries = []
		for await (const [name, handle] of dirHandle.entries()) {
			/** @type {LittlebookFilesystemFileType} */
			const type = handle.kind === "file" ? "file" : "directory"
			entries.push({name, type})
		}

		return entries
	}

	/**
	 *
	 * @param {string} path
	 * @returns
	 */
	async stat(path) {
		const pathSegments = this.parsePath(path)

		try {
			const fileHandle = await this.getFileHandle(pathSegments)
			const file = await fileHandle.getFile()
			return {
				size: file.size,
				modified: new Date(file.lastModified),
				/** @type {LittlebookFilesystemFileType} */
				type: "file",
			}
		} catch (error) {
			try {
				await this.getDirectoryHandle(pathSegments)
				return {
					size: 0,
					modified: null,
					/** @type {LittlebookFilesystemFileType} */
					type: "directory",
				}
			} catch (dirError) {
				throw new Error(`Path not found: ${path}`)
			}
		}
	}

	async mkdir(path, options = {}) {
		const pathSegments = this.parsePath(path)

		if (options.parents) {
			// Create all parent directories
			await this.getDirectoryHandle(pathSegments, true)
		} else {
			if (pathSegments.length === 0) {
				return
			}
			const parentSegments = pathSegments.slice(0, -1)
			const dirName = pathSegments[pathSegments.length - 1]

			const parentHandle = await this.getDirectoryHandle(parentSegments)
			await parentHandle.getDirectoryHandle(dirName, {create: true})
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

		/**
		 *
		 * @param {any} result
		 * @param {ArrayBuffer[]} transfer
		 */
		function send(result, transfer = []) {
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
				console.debug("not implemented.")
				break
			default:
				throw new Error(`unknown method: ${method}`)
		}
	} catch (error) {
		self.postMessage({id, error: error.message})
	}
}

/**
 *
 * @param {object} vfs
 * @param {string} targetPath
 */
async function materializeVFS(vfs, targetPath) {
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
			const content = new TextEncoder().encode(fileData.content)
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
async function downloadAndMaterialize(url, targetPath) {
	try {
		//console.debug(`Downloading VFS from ${url}?`)
		const vfs = await (await fetch(url)).json()
		return materializeVFS(vfs, targetPath)
	} catch (error) {
		console.error(`Failed to download VFS from ${url}:`, error)
		throw error
	}
}
