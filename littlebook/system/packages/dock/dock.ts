import "./dock.css"
import json from "./littlebook.json"

import * as Dockview from "dockview-core"
import * as littlebook from "littlebook"
import {createElement} from "/littlebook:system/packages/utility/create-element.ts"
const log = littlebook.log.extend("dock-surface-manager")

declare module "littlebook" {
	interface Packages {
		dock: typeof pkg
	}
}

const pkg = {
	name: json.name,
	version: json.version,
	settings: {
		defaultOpenDirection: "within" as Dockview.Direction,
	},
	commands: {},
}

export function activate() {
	littlebook.packages[json.name] = pkg
}

export class DockPlace
	implements littlebook.Layout<Dockview.SerializedDockview>
{
	static name = "dock"
	_dockview: Dockview.DockviewApi
	element: HTMLElement

	constructor(element: HTMLElement) {
		this._dockview = Dockview.createDockview(element, {
			createComponent(component) {
				const parent = createElement(component.name, {
					id: component.id,
				})
				log(`creating surface component: "${component.id}"`)
				return {
					element: parent,
					init() {},
				}
			},
		})
		this.element = element
	}
	place(id: string) {
		this._dockview.addPanel({
			id: id,
			component: "little-surface",
		})
	}

	name(id: string, name: string) {
		this._dockview.getPanel(id)?.setTitle(name)
	}

	remove(id: string) {
		this._dockview.removePanel(this._dockview.getPanel(id))
	}

	save() {
		return this._dockview.toJSON()
	}

	focus(id: string) {
		this._dockview.getPanel(id)?.focus()
	}

	restore(json: Dockview.SerializedDockview) {
		this._dockview.fromJSON(json)
	}
}
