/// <reference types="service-worker-types" />

declare global {
	var LITTLEBUILDDATE: number
}

const date = self.LITTLEBUILDDATE || 1
const cachekey = `littlebook-${date}-10`

self.addEventListener("install", async () => {
	await self.skipWaiting()
})

type Responsish = {body: ReadableStream; init: ResponseInit}

const responseResolvers = new Map<string, PromiseWithResolvers<Responsish>>()

self.addEventListener("message", async (messageEvent: MessageEvent) => {
	if (messageEvent.data.type == "response") {
		const responseItem = responseResolvers.get(messageEvent.data.id)
		if (!responseItem) {
			return responseItem.reject(
				`No read response found for id ${messageEvent.data.id}`
			)
		}
		if (messageEvent.data.error) {
			return responseItem.reject(new Error(messageEvent.data.error))
		}
		return responseItem.resolve(messageEvent.data as Responsish)
	}
})

self.addEventListener("fetch", async (fetchEvent: FetchEvent) => {
	const request = fetchEvent.request
	if (request.method !== "GET") return fetchEvent.respondWith(fetch(request))
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

	fetchEvent.respondWith(
		(async () => {
			const cache = await caches.open(cachekey)

			try {
				if (lbImportURL) {
					const client = await self.clients.get(fetchEvent.clientId)
					const reqid = Math.random().toString(36).slice(2)
					const resolvers = Promise.withResolvers<Responsish>()
					responseResolvers.set(reqid, resolvers)

					client.postMessage({
						id: reqid,
						type: "request",
						url: lbImportURL.toString(),
						options: {
							headers: Object.fromEntries(request.headers.entries()),
							method: request.method,
							destination: request.destination,
						},
					})
					fetchEvent.waitUntil(resolvers.promise)

					const responsish = await resolvers.promise

					const response = new Response(responsish.body, responsish.init)

					cache.put(fetchEvent.request, response.clone())
					return response
				} else {
					return fetch(request).then(async response => {
						if (!response.ok) {
							const cachedResponse = await cache.match(fetchEvent.request)
							if (cachedResponse) {
								return cachedResponse
							}
						}
						cache.put(fetchEvent.request, response.clone())
						return response
					})
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
