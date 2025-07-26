import type {LbSurfaceLayer} from "littlebook"

export const defaultLayer: LbSurfaceLayer = (function () {
	const elements = new Map<string, HTMLElement>()
	function place(id: string) {
		const el = document.createElement("little-surface")
		el.id = id
		lb.getSurface(id).view.render(el)
		lb.renderer.appendElements(el)
		elements.set(id, el)
	}
	return {
		get element() {
			return lb.renderer.areas.main
		},
		place,
		remove(id: string) {
			const el = document.getElementById(id)
			if (el) {
				el.remove()
			}
			elements.delete(id)
		},
		save() {
			return [...elements.keys()]
		},
		restore(items: string[]) {
			for (const id of items) place(id)
		},
		focus(id: string) {
			this._elements.get(id)?.focus()
		},
	}
})()
