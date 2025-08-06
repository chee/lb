export default async function setupServiceWorker(handler: RequestishHandler) {
	navigator.serviceWorker.addEventListener("controllerchange", function () {
		console.log(
			"%cNew service worker activated, reloading",
			"color: pink; font-weight: bold"
		)
		location.reload()
	})

	navigator.serviceWorker.addEventListener("message", async event => {
		if (event.data.type == "request") {
			const requestish: Requestish = event.data

			if (!event.source) {
				throw new TypeError("can't operate without a source")
			}

			try {
				const responsish = await handler(requestish.url, requestish)
				event.source.postMessage(
					{
						id: event.data.id,
						type: "response",
						body: responsish.body,
						status: responsish.status ?? 200,
						headers: responsish.headers ?? {},
					} satisfies Responsish,
					{transfer: [responsish.body.buffer]}
				)
			} catch (cause) {
				const error = cause instanceof Error ? cause : new Error(String(cause))
				event.source.postMessage({
					type: "response",
					id: event.data.id,
					body: error.message,
					init: {
						url: event.data.url.toString().slice(1),
						status: error.message.toString().toLowerCase().includes("not found")
							? 404
							: 500,
					},
				})
			}
		}
	})

	const existingSw = await navigator.serviceWorker.getRegistration()
	await navigator.serviceWorker
		.register("/service-worker.js")
		.then(async () => {
			if (!existingSw?.active) {
				location.reload()
				return
			}
			console.log(
				"Service worker registered, loading %cLittlebook.%cSystem!",
				"font-weight: bold; color: #3c9;",
				"font-weight: bold; color: #000;"
			)
		})
}
