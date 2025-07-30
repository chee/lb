export function createElement(
	name: string,
	attributes?: Record<string, any>,
	props?: Record<string, any>
) {
	const el = document.createElement(name)
	if (attributes) {
		for (const [key, value] of Object.entries(attributes)) {
			el.setAttribute(key, value)
		}
	}
	if (props) {
		Object.assign(el, props)
	}
	return el
}
// todo <e-d-i-t/> should be an area
// but to think about that we'd need to think about surface
// and about how/if areas are surfaced on lb.
function createNormalArea(element: HTMLElement): LbArea {
	const elements = new Map<string, HTMLElement>()
	function place(id: string) {
		const el = document.createElement("little-surface")
		el.id = id
		element.append(el)
		//lb.renderSurface(lb.getSurface(id), el)
		elements.set(id, el)
	}
	return {
		element,
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
			this.elements[id]?.focus()
		},
	}
}
