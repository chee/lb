//import {events, Opstreams, Vibe} from "littlebook"
//import {LbSet} from "../packages/utility/set.ts"

//const surfaces = {} as Record<string, Surface<any>>
//const surfacesByURL = {} as Record<string, string>

// class Surface extends HTMLElement {
// 	static surfaces = new Map<string, Surface>()
// 	static surfacesByURL = new Map<string, Surface>()
// 	surfaces = Surface.surfaces
// 	surfacesByURL = Surface.surfacesByURL
// 	connectedCallback() {
// 		this.style.height = "100%"
// 		this.style.width = "100%"
// 		const surface = surfaces[this.id]
// 		if (!surface) {
// 			throw new Error(`Surface not found: ${this.id}`)
// 		}
// 		surface.view.mount(this)
// 	}
// }

// export const surfaces = {} as Record<string, Surface<any>>

// export function createSurface<T extends keyof Opstreams | void = void>(
// 	url?: string
// ) {
// 	const id = Math.random().toString(36).slice(2)
// 	const surface: Surface<T> = {
// 		id,
// 		url,
// 		vibes: new LbSet<Vibe>(),
// 	}
// 	events.emit("preparesurface", surface)
// 	surfaces[id] = surface
// 	events.emit("surface", surface)
// 	return surface
// }

// export interface View<T extends keyof Opstreams | void = void> {
// 	surface: Surface<T>
// 	opstream?: T extends keyof Opstreams ? Opstreams[T] : void
// 	mount(element: HTMLElement): () => void
// }

// customElements.define("s-u-r-f-a-c-e", Surface)

export let currentSurface = 1
