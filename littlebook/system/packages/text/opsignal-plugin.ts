import {Transaction} from "@codemirror/state"
import {EditorView, ViewPlugin, ViewUpdate} from "@codemirror/view"
import {OpEvent, Opsignal, TextOp, watchOpsignal} from "littlebook"

const OpstreamTextPlugin = (opsignal: Opsignal<string, TextOp>) =>
	ViewPlugin.fromClass(
		class {
			view: EditorView
			cleanup: () => void
			constructor(view: EditorView) {
				this.view = view
				this.cleanup = watchOpsignal(opsignal, this.connection)
			}
			internal = false
			connection = (event: OpEvent<string, TextOp>) => {
				if (event.type == "snapshot") {
					this.view.dispatch({
						annotations: [Transaction.remote.of(true)],
						changes: {
							from: 0,
							to: this.view.state.doc.length,
							insert: event.op,
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
