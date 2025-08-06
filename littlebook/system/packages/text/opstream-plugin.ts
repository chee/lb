import {Transaction} from "@codemirror/state"
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view"
import {IOpstream, SnapshotOp, TextOp} from "littlebook"

const OpstreamTextPlugin = (opstream: IOpstream<string, TextOp>) =>
	ViewPlugin.fromClass(
		class {
			view: EditorView
			cleanup: () => void
			constructor(view: EditorView) {
				this.view = view
				this.cleanup = opstream.connect(this.connection)
			}
			internal = false
			connection = (op: TextOp | SnapshotOp<string>) => {
				if (op.type == "snapshot") {
					this.view.dispatch({
						annotations: [Transaction.remote.of(true)],
						changes: {
							from: 0,
							to: this.view.state.doc.length,
							insert: op.value,
						},
					})
				} else {
					this.view.dispatch({
						annotations: [Transaction.remote.of(true)],
						changes: {
							from: op.from,
							to: op.to,
							insert: op.value,
						},
					})
				}
			}
			update(update: ViewUpdate) {
				if (update.docChanged && this.internal) {
					for (const tr of update.transactions) {
						if (tr.annotation(Transaction.remote)) continue
						if (tr.changes.empty) continue
						tr.changes.iterChanges((_fromA, toA, fromB, _toB, text) => {
							opstream.apply({
								// todo remove this type field
								type: "text",
								from: fromB,
								to: toA,
								value: text.toString(),
							})
						})
					}
				}
			}
			destroy() {
				this.cleanup()
			}
		}
	)
export default OpstreamTextPlugin
