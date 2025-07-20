declare interface LittlebookSurface {
	id: string
	modes: LittlebookMode[]
	meta: Record<string, any>
	name?: string
	layer?: LittlebookSurfaceLayer
	url?: URL
	element?: HTMLElement
	refit(): void
	focus(): void
	destroy(): void
}

declare interface LittlebookSurfaceLayer extends Record<any, any> {
	place(surface: LittlebookSurface): void
}

declare interface LittlebookMode {
	name: string
	codemirrorExtensions?: import("@codemirror/state").Extension
}
