declare type Requestish = {
	id: string | number
	type: "request"
	url: string
	headers: Record<string, string>
	method: string
	destination: RequestDestination
	referrer: string
}

declare type Responsish = {
	id?: string | number
	type: "response"
	body: Uint8Array
	status?: number
	headers?: Record<string, string>
}

declare type RequestishHandler = (
	url: string,
	info: Requestish
) => Promise<Pick<Responsish, "body" | "status" | "headers">>
