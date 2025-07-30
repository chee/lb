/** @jsxImportSource react */
/** @jsxRuntime automatic */
import {
	createShapeId,
	Tldraw,
	type Editor,
	type SerializedStore,
	type TldrawProps,
	type TLRecord,
} from "tldraw"
import type * as Littlebook from "littlebook"
import {createRoot} from "react-dom/client"
import "./tldraw.css"
import {tldrawSurface} from "./surface.tsx"

// todo maybe make these take a ref to littlebook instead of the global
export class TldrawSurfaceLayer
	implements Littlebook.LittlebookSurfaceLayer<SerializedStore<TLRecord>>
{
	static name = "tldraw"
	static use() {
		lb.areas.register(
			TldrawSurfaceLayer.name,
			element => new TldrawSurfaceLayer(element)
		)
	}
	element: HTMLElement
	_root: ReturnType<typeof createRoot>
	_editor: Editor
	_idShapeIdMap: Map<string, string> = new Map()
	constructor(element: HTMLElement) {
		const root = createRoot(element)
		element.style.position = "fixed"
		element.style.inset = "0"
		this._root = root
		root.render(
			<Tldraw
				persistenceKey="t-l-d-r-a-w"
				shapeUtils={[tldrawSurface]}
				onMount={editor => {
					this._editor = editor
				}}
			/>
		)
		this.element = element
	}
	place(id: string) {
		const shapeId = createShapeId(id)
		this._idShapeIdMap.set(id, shapeId)

		this._editor.createShape({
			id: shapeId,
			type: "surface",
			x: 100,
			y: 100,
		})
	}
	remove() {}
	save() {
		return null as SerializedStore<TLRecord>
	}
	focus() {}
	restore() {}

	//remove(id: string) {
	//	this._dockview.removePanel(this._dockview.getPanel(id))
	//}

	//save() {
	//return this._dockview.toJSON()
	//	}

	//focus(id: string) {
	//this._dockview.getPanel(id)?.focus()
	//}

	//restore(json: Dockview.SerializedDockview) {
	//this._dockview.fromJSON(json)
	//	}
}
