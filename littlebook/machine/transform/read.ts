export default async function read(url: string): Promise<Uint8Array> {
	let bytes: Uint8Array | undefined
	const protocolName = url.slice(0, url.indexOf(":"))

	if (protocolName in __lb.env) {
		try {
			bytes = await __lb.env[protocolName].read(url.toString())
		} catch (cause) {
			// todo return a 404, or 400, or 500
			throw new Error(cause, {cause})
		}
	}

	if (!bytes) {
		console.error(
			`failed to read file at ${url.toString()}. no reader for "${url}:".`
		)
		throw new Error(`no way to read ${url}`)
	}

	return bytes
}
