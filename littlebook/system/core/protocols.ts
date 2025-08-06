// import {workingDirectory} from "littlebook"
// import {resolvePath} from "../packages/utility/resolve-path.ts"

// export const nativefs = window.__lb_native_env

// const encoder = new TextEncoder()
// const decoder = new TextDecoder()

// // todo you know what maybe this whole protocols thing is dumb
// export interface ProtocolResponses {
// 	opfs?: File
// 	file?: File
// 	taurifs?: File
// }

// export type ProtocolHandler<T> = (url: URL | string) => Promise<T>

// export const protocols: {
// 	[K in keyof ProtocolResponses]: (
// 		url: URL | string
// 	) => Promise<ProtocolResponses[K]>
// } = {
// 	async [nativefs.protocol]<T = any>(url: URL | string) {
// 		url = url.toString()
// 		let bytes: Uint8Array
// 		let text: string
// 		let json: T
// 		const getBytes = async () => bytes || (bytes = await nativefs.read(url))

// 		return {
// 			bytes: async () =>
// 				bytesSource || (bytesSource = new URLSource(url, await getBytes())),
// 			text: async () =>
// 				textSource || (textSource = new URLSource(url, await getText())),
// 			json: async () =>
// 				jsonSource || (jsonSource = new URLSource(url, await getJSON())),
// 			readTime: new Date(),
// 			write(content: Uint8Array | string) {
// 				return nativefs.write(
// 					url,
// 					typeof content == "string" ? encoder.encode(content) : content
// 				)
// 			},
// 			lastModified: async () => (await nativefs.stat(url)).modified,
// 		}
// 	},
// }

// if (nativefs.protocol == "taurifs") {
// 	protocols.file = protocols.taurifs
// }

// window.__lb_protocols = protocols

// declare global {
// 	var __lb_protocols: typeof protocols
// }

// export async function findFile(url: URL | string): Promise<ILocalFile> {
// 	if (typeof url == "string") {
// 		url = resolvePath(
// 			url,
// 			nativefs,
// 			url.startsWith(".") ? workingDirectory : undefined
// 		)
// 	}
// 	const pname = url.protocol.slice(0, -1)
// 	const fetcher = protocols[pname]
// 	if (!fetcher) {
// 		throw new Error(`no protocol handler registered for "${pname}"`)
// 	}
// 	return await fetcher(url)
// }
