/// <reference types="service-worker-types" />
import esbuild, {type TransformOptions} from "esbuild-wasm"

declare global {
	var LITTLEBUILDDATE: number
}

const date = self.LITTLEBUILDDATE || 1
const cachekey = `littlebook-${date}-10`

const extmap = {
	mjs: "js",
	cjs: "js",
	cts: "ts",
	mts: "ts",
}

async function transform(
	url: URL,
	input: string | Uint8Array,
	options?: TransformOptions
) {
	const ext = url.pathname.split(".").pop() || "js"
	return await esbuild.transform(input, {
		loader: extmap[ext] || ext,
		sourcemap: "inline",
		platform: "browser",
		format: "esm",
		sourcefile: url.toString(),
		...options,
	})
}

const esbuildInitialized = Promise.withResolvers<void>()

esbuild
	.initialize({
		wasmURL: "/esbuild.wasm",
		worker: false,
	})
	.then(() => {
		esbuildInitialized.resolve()
	})

self.addEventListener("install", async () => {
	await esbuildInitialized.promise
	await self.skipWaiting()
})

const readResponses = new Map<string, PromiseWithResolvers<Uint8Array>>()

self.addEventListener("message", async (messageEvent: MessageEvent) => {
	if (messageEvent.data.type !== "read") return
	const responseItem = readResponses.get(messageEvent.data.id)
	if (!responseItem) {
		console.error(`No read response found for id ${messageEvent.data.id}`)
	}
	if (messageEvent.data.error) {
		responseItem.reject(new Error(messageEvent.data.error))
		return
	}
	responseItem.resolve(messageEvent.data.bytes)
})

self.addEventListener("fetch", async (fetchEvent: FetchEvent) => {
	// todo ???
	if (fetchEvent.request.method !== "GET")
		return fetchEvent.respondWith(fetch(fetchEvent.request))
	const url = new URL(fetchEvent.request.url)
	let lbImportURL: URL | undefined

	if (
		url.hostname == self.location.hostname &&
		url.port == self.location.port &&
		url.protocol == self.location.protocol
	) {
		try {
			const u = new URL(url.pathname.slice(1))
			lbImportURL = u
		} catch {}
	}

	console.log("dewbug key 9")

	fetchEvent.respondWith(
		(async () => {
			const cache = await caches.open(cachekey)

			try {
				if (lbImportURL) {
					const client = await self.clients.get(fetchEvent.clientId)
					const reqid = Math.random().toString(36).slice(2)
					const resolvers = Promise.withResolvers<Uint8Array>()
					readResponses.set(reqid, resolvers)
					client.postMessage({
						id: reqid,
						type: "read",
						path: lbImportURL.toString(),
					})
					fetchEvent.waitUntil(resolvers.promise)
					const bytes = await resolvers.promise
					const result = await transform(lbImportURL, bytes)
					result.warnings.forEach(warning => {
						console.warn(`esbuild warning: ${warning.text}`)
					})
					const response = new Response(result.code, {
						headers: {"content-type": mime(url.pathname)},
						status: 200,
					})
					cache.put(fetchEvent.request, response.clone())
					return response
				} else {
					const response = await fetch(fetchEvent.request)
					if (response.ok) {
						const clonedResponse = response.clone()
						cache.put(fetchEvent.request, clonedResponse)
						return response
					} else {
						return cache.match(fetchEvent.request).then(cachedResponse => {
							if (cachedResponse) {
								return cachedResponse
							}
							return new Response("Not found", {
								status: 404,
								statusText: "Not Found",
							})
						})
					}
				}
			} catch {
				return cache.match(fetchEvent.request).then(cachedResponse => {
					if (cachedResponse) {
						return cachedResponse
					}
					return new Response("Not found", {
						status: 404,
						statusText: "Not Found",
					})
				})
			}
		})()
	)
})
/*
addEventListener("message", async event => {
	if (event.data.type == "importmap") {
		const {importmap} = event.data
		if (importmap) {
		}
	} else if (event.data.type == "extmap") {
		const {importmap} = event.data
		if (importmap) {
		}
	}
})
 */
/**
 * let path = args.path
				if (path.startsWith(env.protocol)) {
					path = path.slice(env.protocol.length).replace(/^\/+/, "/")
				}
				const isRelative = path.match(/^\./)
				if (isRelative) {
					path = args.resolveDir.concat(`/${path}`)
				}

				if (importmap.imports[path]) {
					path = importmap.imports[path]
					// sorry to anyone trying to use the low network bandwidth filesystem
					const lbfsMatch = path.match(/^(littlebook):(.*)/)
					if (lbfsMatch) {
						;[, , path] = lbfsMatch
						const systemMatch = path.match(/^\/?system\/(.*)/)
						const userMatch = path.match(/^\/?user\/(.*)/)
						if (systemMatch) {
							path = `${env.systemDirectory.toString()}/${systemMatch[1]}`
						} else if (userMatch) {
							path = `${env.userDirectory.toString()}/${userMatch[1]}`
						}
					} else {
						const first = path[0]
						if (!["/", "."].includes(first)) {
							return {path, external: true}
						}
					}
				}
 */

const mimes = {
	txt: "text/plain",
	html: "text/html",
	htm: "text/html",
	css: "text/css",

	js: "application/javascript",
	ts: "application/javascript",
	tsx: "application/javascript",
	mjs: "application/javascript",
	json: "application/json",
	xml: "text/xml",
	csv: "text/csv",
	tsv: "text/tab-separated-values",
	md: "text/markdown",
	rtf: "application/rtf",
	yaml: "text/yaml",
	yml: "text/yaml",

	c: "text/x-c",
	cpp: "text/x-c++",
	cc: "text/x-c++",
	cxx: "text/x-c++",
	h: "text/x-c",
	hpp: "text/x-c++",
	java: "text/x-java-source",
	py: "text/x-python",
	php: "text/x-php",
	rb: "text/x-ruby",
	pl: "text/x-perl",
	sh: "text/x-shellscript",
	sql: "text/x-sql",
	go: "text/x-go",
	rs: "text/x-rust",
	swift: "text/x-swift",
	kt: "text/x-kotlin",
	scala: "text/x-scala",

	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	bmp: "image/bmp",
	webp: "image/webp",
	svg: "image/svg+xml",
	ico: "image/x-icon",
	tiff: "image/tiff",
	tif: "image/tiff",
	heic: "image/heic",
	heif: "image/heif",
	avif: "image/avif",

	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4",
	aac: "audio/aac",
	flac: "audio/flac",
	wma: "audio/x-ms-wma",
	opus: "audio/opus",

	mp4: "video/mp4",
	avi: "video/x-msvideo",
	mov: "video/quicktime",
	wmv: "video/x-ms-wmv",
	flv: "video/x-flv",
	webm: "video/webm",
	mkv: "video/x-matroska",
	"3gp": "video/3gpp",
	mpg: "video/mpeg",
	mpeg: "video/mpeg",

	pdf: "application/pdf",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	ppt: "application/vnd.ms-powerpoint",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	odt: "application/vnd.oasis.opendocument.text",
	ods: "application/vnd.oasis.opendocument.spreadsheet",
	odp: "application/vnd.oasis.opendocument.presentation",

	zip: "application/zip",
	rar: "application/vnd.rar",
	"7z": "application/x-7z-compressed",
	tar: "application/x-tar",
	gz: "application/gzip",
	bz2: "application/x-bzip2",
	xz: "application/x-xz",

	ttf: "font/ttf",
	otf: "font/otf",
	woff: "font/woff",
	woff2: "font/woff2",
	eot: "application/vnd.ms-fontobject",

	exe: "application/vnd.microsoft.portable-executable",
	msi: "application/x-msdownload",
	deb: "application/vnd.debian.binary-package",
	dmg: "application/x-apple-diskimage",
	pkg: "application/x-newton-compatible-pkg",
	apk: "application/vnd.android.package-archive",

	sqlite: "application/vnd.sqlite3",
	db: "application/x-sqlite3",
	parquet: "application/parquet",
	avro: "application/avro",

	wasm: "application/wasm",
	manifest: "text/cache-manifest",
	webmanifest: "application/manifest+json",

	ini: "text/plain",
	conf: "text/plain",
	properties: "text/plain",
	toml: "application/toml",

	bin: "application/octet-stream",
	iso: "application/x-iso9660-image",
	torrent: "application/x-bittorrent",
} as const

type Mimes = typeof mimes
export default mimes
export function mime<Ext extends string>(
	filename: Ext | `${string}.${Ext}`
): Ext extends keyof Mimes ? Mimes[Ext] : "application/octet-stream" {
	const ext = filename.toLowerCase().substring(filename.lastIndexOf(".") + 1)
	return mimes[ext] || "application/octet-stream"
}
