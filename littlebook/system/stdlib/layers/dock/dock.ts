import type {LbHandle, LbSurfaceLayer} from "littlebook"
import * as Dockview from "dockview-core"
const log = littlebook.log.extend("dock-surface-manager")
declare module "littlebook" {
	interface LbSurface<H extends LbHandle = LbHandle> {
		_dockAPI?: Dockview.DockviewPanel["api"]
	}
}

export class DockviewSurfaceLayer
	implements LbSurfaceLayer<Dockview.DockviewApi["toJSON"]>
{
	static name = "dock"
	static async use() {
		await lb.style("https://esm.sh/dockview-core/dist/styles/dockview.css")
		await lb.style(import.meta.resolve("./dock.css"))
		lb.registerLayer(
			DockviewSurfaceLayer.name,
			element => new DockviewSurfaceLayer(element)
		)
	}
	_dockview: Dockview.DockviewApi
	element: HTMLElement
	constructor(element: HTMLElement) {
		this._dockview = Dockview.createDockview(element, {
			createComponent(component: {id: string}) {
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

	restore(json: Dockview.DockviewApi["toJSON"]) {
		this._dockview.fromJSON(json)
	}
}
