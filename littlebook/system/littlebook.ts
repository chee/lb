import "./styles/styles.ts"
import {createEmitter} from "/littlebook:system/packages/utility/emitter.ts"
import createLogger from "/littlebook:system/packages/utility/logger.ts"
export * from "./core/layouts.ts"
export * from "./core/ops.ts"
export * from "./core/opsignals.ts"
export * from "./core/packages.ts"
export * from "./core/protocols.ts"
export * from "./core/surfaces.ts"
export * from "./core/vibes.ts"

export interface LittlebookEventsMap {
	focus: [string]
	"change-directory": [URL]
	[key: `env:${string}`]: [string]
	//	preparesurface: [Surface<any>]
	//	surface: [Surface<any>]
}

export type LittlebookEvents<T extends keyof LittlebookEventsMap> =
	LittlebookEventsMap[T]

export const log = createLogger("littlebook")
export const events = createEmitter<LittlebookEventsMap>()
export const nativefs = window.__lb.nativeEnv

export let workingDirectory = new URL(".", nativefs.cwd)
export const environmentVariables: Record<string, string> = nativefs.env ?? {}

export function changeDirectory(url: URL): void {
	workingDirectory = url
	events.emit("change-directory", url)
}

export function getEnv(name: string): any {
	return environmentVariables[name]
}

export function setEnv(name: string, value: string): void {
	environmentVariables[name] = value
	events.emit(`env:${name}`, value)
}

declare global {
	interface Window {
		lb: typeof import("littlebook")
	}
}

queueMicrotask(async () => {
	window.lb = await import(`${"littlebook"}`)
	const machine = window.__lb.machine

	machine.plugins.push({
		name: "wasm",
		setup(context) {
			context.onTransform({filter: /\.wasm$/}, input => {
				return {
					contents: input.contents,
					responseHeaders: {"content-type": "application/wasm"},
				}
			})
		},
	})

	const dockPath = "/littlebook:system/packages/dock/dock.ts"
	await import(dockPath)
	const textEditorPath = "/littlebook:system/packages/text/text-editor2.tsx"
	await import(textEditorPath)
	const userScript = "/littlebook:user/init.ts"
	await import(userScript).catch(error => {
		console.error(`Failed to load user script "${userScript}":`, error)
	})
})
