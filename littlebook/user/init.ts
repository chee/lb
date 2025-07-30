//import * as littlebook from "littlebook"

//export default function () {}

// import {EditorView} from "@codemirror/view"
// import {DockPlace} from "../system/stdlib/places/dock/dock"
// import * as TextFileEditor from "/littlebook:system/stdlib/views/text-editor/text-editor.ts"
// import {JavaScript} from "/littlebook:system/stdlib/views/text-editor/languages/javascript.ts"
// await DockPlace.use()
// TextFileEditor.use()
// lb.packages.textFileEditor.languages.javascript = JavaScript
// lb.packages.textFileEditor.addLanguagePattern(/\.[mc]?[tj]sx?$/, "javascript")

// lb.modes.logAllChanges = props => {
// 	return {
// 		name: "logAllChanges",
// 		codemirrorExtension: [
// 			EditorView.updateListener.of(update => {
// 				console.log(update.changes)
// 			}),
// 		],
// 		teardown() {
// 			console.log("tearing down logAllChanges mode for", props.resource.url)
// 		},
// 	}
// }

// lb.addModeMatcher(() => true, "logAllChanges")

// await lb.open(
// 	lb.nativefs.systemDirectory.toString().concat("core/littlebook.ts")
// )
