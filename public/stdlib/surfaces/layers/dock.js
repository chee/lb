// todo vendor in
import * as Dockview from "dockview-core"
self.lb.style(import.meta.resolve("./dock.css"))
const log = self.lb.logger.extend("dock-surface-manager")
lb.registerSurfaceLayer(
	"dock",
	/**
	 * @param {HTMLElement} element
	 * @returns {LittlebookSurfaceLayer}
	 */
	element => ({
		_dockview: Dockview.createDockview(element, {
			createComponent({id}) {
				const element = document.createElement("littlebook-dock-panel")
				element.id = id
				/** @type {LittlebookSurface} */
				let surface = null
				return {
					element,
					init(opts) {
						surface = /** @type {LittlebookSurface} */ (opts.params)
						log(`initializing "${surface.name}"`)
						console.log({surface})
						if ("render" in surface && typeof surface.render === "function") {
							surface.render?.(element)
						} else {
							element.append(surface.element)
						}
					},
					layout() {
						window.dispatchEvent(
							new CustomEvent("lb:surfacemanager:layout", {
								detail: {surface: surface, manager: this},
							})
						)
						surface.refit?.()
					},
					focus() {
						surface.focus?.()
					},
					dispose() {
						surface.destroy?.()
					},
				}
			},
		}),
		place(surface) {
			log(`placing surface "${surface.name}"`)
			this._dockview.addPanel({
				id: surface.id,
				params: surface,
			})
			return surface
		},
		close(id) {
			this._dockview.removePanel(id)
		},
		save() {
			return this._dockview.toJSON()
		},
		restore(json) {
			this._dockview.fromJSON(json)
		},
		destroy() {
			this._dockview.dispose()
		},
	})
)
