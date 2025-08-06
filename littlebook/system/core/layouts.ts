import {createElement} from "../packages/utility/create-element.ts"

export interface Layout<S = unknown> {
	element: HTMLElement
	place(id: string, name?: string): void
	remove(id: string): void
	restore(snapshot: S): void
	save(): S
	focus(id: string): void
	name?(id: string, name: string): void
}

export const mainElement = createElement("e-d-i-t", {role: "main"})

export const echoElement = createElement("e-c-h-o", {
	role: "status",
	"aria-live": "polite",
})

document.body.append(mainElement, echoElement)

export function createHTMLLayout(element: HTMLElement): Layout<string[]> {
	function place(id: string, name?: string) {
		const child = createElement(name ?? "s-u-r-f-a-c-e", {id})
		element.appendChild(child)
	}
	function remove(id: string) {
		const child = element.querySelector(`#${id}`)
		if (child) {
			element.removeChild(child)
		}
	}
	return {
		element,
		place,
		remove,
		save() {
			return [...element.children].map(e => e.id)
		},
		restore(ids) {
			for (const id of ids) {
				place(id)
			}
		},
		focus(id: string) {
			const target = element.querySelector(`#${id}`) as HTMLElement
			target.focus()
		},
	}
}

export const layouts = {
	main: createHTMLLayout(mainElement),
}
