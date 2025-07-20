import events from ":global/events.js"
import debug from ":global/log.js"
import {css} from "@codemirror/lang-css"
const log = debug.extend("css-language")
events.once("lb:text-editor-language-registry:installed", () => {
	log("installing CSS language module")
	lb.registries.textEditorLanguage.register("css", props => {
		return {
			name: "css",
			extension: [css()],
		}
	})
	log("adding pattern")
	lb.registries.textEditorLanguage.addPattern([/\.css$/, "css"])
})
