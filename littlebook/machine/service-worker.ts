/// <reference types="service-worker-types" />

declare global {
	var LITTLEBUILDDATE: number
}

const date = self.LITTLEBUILDDATE || 1
const cachekey = `littlebook-${date}-10`

self.addEventListener("install", async () => {
	await self.skipWaiting()
})

const responseResolvers = new Map<number, PromiseWithResolvers<Responsish>>()

self.addEventListener("message", async (messageEvent: MessageEvent) => {
	if (messageEvent.data.type == "response") {
		const responseItem = responseResolvers.get(messageEvent.data.id)
		if (!responseItem) {
			return console.warn(
				`No read response found for id ${messageEvent.data.id}`
			)
		}
		if (messageEvent.data.error) {
			return responseItem.reject(new Error(messageEvent.data.error))
		}
		return responseItem.resolve(messageEvent.data as Responsish)
	}
})

let reqcount = 0
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
			lbImportURL = new URL(url.pathname.slice(1))
		} catch {}
	}

	fetchEvent.respondWith(
		(async () => {
			const cache = await caches.open(cachekey)

			try {
				if (lbImportURL) {
					const client = await self.clients.get(fetchEvent.clientId)
					const reqid = reqcount++
					const resolvers = Promise.withResolvers<Responsish>()
					responseResolvers.set(reqid, resolvers)

					if (!client) {
						throw new Error(
							`the client has gone missing!!! ${fetchEvent.clientId}. i have NO IDEA what to do`
						)
					}
					client.postMessage({
						id: reqid,
						type: "request",
						url: lbImportURL.toString(),
						headers: Object.fromEntries(request.headers.entries()),
						method: request.method,
						destination: request.destination,
						referrer: request.referrer,
					} satisfies Requestish)
					fetchEvent.waitUntil(resolvers.promise)

					const responsish = await resolvers.promise

					const response = new Response(responsish.body, {
						status: responsish.status,
						headers: new Headers(responsish.headers),
					})

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
