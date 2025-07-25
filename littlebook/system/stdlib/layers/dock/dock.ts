import type {LbResourceHandle, LbSurfaceLayer} from "littlebook"
import "./dock.css"
import * as Dockview from "dockview-core/dist/dockview-core.esm.js"
const log = littlebook.log.extend("dock-surface-manager")
declare module "littlebook" {
	interface LbSurface<H extends LbResourceHandle = LbResourceHandle> {
		_dockAPI?: Dockview.DockviewPanelApi
	}
}

// todo maybe make these take a ref to littlebook instead of the global
export class DockviewSurfaceLayer
	implements LbSurfaceLayer<Dockview.SerializedDockview>
{
	static name = "dock"
	static use() {
		lb.registerLayer(
			DockviewSurfaceLayer.name,
			element => new DockviewSurfaceLayer(element)
		)
	}
	_dockview: Dockview.DockviewApi
	element: HTMLElement
	constructor(element: HTMLElement) {
		this._dockview = Dockview.createDockview(element, {
			createComponent(component) {
				const parent = document.createElement("little-surface")
				parent.style.display = "contents"
				parent.dataset.surface = component.id
				log(`creating surface component: "${component.id}"`)
				return {
					element: parent,
					init({api}) {
						const surface = lb.getSurface(component.id)
						if (!surface) {
							throw new Error(`Surface with id "${component.id}" not found.`)
						}
						log(`initializing surface: "${surface.name ?? surface.id}"`)
						surface._dockAPI = api
						surface.view.render(parent)
						setTimeout(() => {
							api.setTitle(surface.name)
						})
					},
				}
			},
		})
		this.element = element
	}
	place(id: string) {
		this._dockview.addPanel({
			id: id,
			component: "surface",
		})
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
