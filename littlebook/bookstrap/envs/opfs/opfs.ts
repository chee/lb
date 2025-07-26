import type {LbEnvironment} from "../../bookstrap.ts"

export interface OPFSFilesystemLibrary extends LbEnvironment {
	props(): Promise<{
		env: Record<string, string>
		cwd: string
		systemDirectory: string
		userDirectory: string
		protocol: string
	}>
}

export type OPFSFilesystemWorkerLibrary = Omit<
	OPFSFilesystemLibrary,
	"env" | "cwd" | "systemDirectory" | "userDirectory" | "protocol"
>

class OPFSHostClient implements LbEnvironment {
	worker: Worker
	pendingCalls: Map<string, {resolve: Function; reject: Function}>
	properties: {
		env?: Record<string, string>
		cwd?: string
		systemDirectory?: string
		userDirectory?: string
		protocol?: string
	}
	propertyPromise: Promise<typeof this.properties>
	constructor(workerPath = "/envs/opfs/opfs.worker.js") {
		this.worker = new Worker(workerPath)
		this.pendingCalls = new Map()
		this.properties = {}
		this.worker.addEventListener("message", this.handleMessage.bind(this))
		this.propertyPromise = this.getProperties()
	}

	handleMessage(e) {
		const {id, result, error} = e.data
		const pending = this.pendingCalls.get(id)

		if (pending) {
			this.pendingCalls.delete(id)
			if (error) {
				pending.reject(error)
			} else {
				pending.resolve(result)
			}
		}
	}

	callWorker<M extends keyof OPFSFilesystemWorkerLibrary>(
		method: M,
		...args: Parameters<OPFSFilesystemWorkerLibrary[M]>
	): Promise<ReturnType<OPFSFilesystemWorkerLibrary[M]>> {
		return new Promise((resolve, reject) => {
			const id = Math.random().toString(36)

			let transferables: ArrayBufferLike[] = []
			if (method == "write" && args[1] instanceof Uint8Array) {
				transferables = [args[1].buffer]
			}

			this.pendingCalls.set(id, {resolve, reject})
			this.worker.postMessage({id, method, args}, transferables)
		})
	}

	async getProperties() {
		if (!this.properties) {
			this.properties = await this.callWorker("props")
		}
		return this.properties
	}

	async read(path: string | URL) {
		await this.propertyPromise
		return await this.callWorker("read", path.toString())
	}

	async write(path: string | URL, bytes: Uint8Array) {
		await this.propertyPromise
		return await this.callWorker("write", path.toString(), bytes)
	}

	async list(path: string | URL) {
		await this.propertyPromise
		return await this.callWorker("list", path.toString())
	}

	async stat(path: string | URL) {
		await this.propertyPromise
		const result = await this.callWorker("stat", path.toString())
		return {
			...result,
			modified: result.modified ? new Date(result.modified) : null,
		}
	}

	async rm() {
		throw new Error("Not implemented")
	}

	async install() {
		await this.propertyPromise
		await this.callWorker("install")
	}

	async uninstall() {
		await this.propertyPromise
		await this.callWorker("uninstall")
	}

	async mkdir(path, options) {
		await this.propertyPromise
		return await this.callWorker("mkdir", path, options)
	}

	get env() {
		return this.properties?.env || {}
	}

	get cwd() {
		return this.properties?.cwd || "opfs:///"
	}

	get systemDirectory() {
		return this.properties?.systemDirectory || "opfs:///littlebook/system/"
	}

	get userDirectory() {
		return this.properties?.userDirectory || "opfs:///littlebook/user/"
	}

	get protocol() {
		return this.properties?.protocol || "opfs:"
	}

	// Clean up worker when done
	terminate() {
		this.worker.terminate()
		// Reject any pending calls
		for (const [_id, pending] of this.pendingCalls) {
			pending.reject(new Error("Worker terminated"))
		}
		this.pendingCalls.clear()
	}
}

;(async function () {
	try {
		const host = new OPFSHostClient()
		self.__lb_env = self.__lb_env || {}
		self.__lb_env.opfs = host
		self.dispatchEvent(new Event("__lb_env:opfs"))
	} catch {
		self.dispatchEvent(new Event("__lb_env:opfs"))
	}
})()
