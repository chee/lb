import {javascript} from "@codemirror/lang-javascript"
lb.registries.textEditorLanguage.register("javascript", props => {
	return {
		name: "javascript",
		extension: [
			javascript({
				jsx: props.url.pathname.endsWith("x"),
				typescript: props.url.pathname.startsWith("t"),
			}),
		],
	}
})

lb.registries.textEditorLanguage.addPattern([/\.[tj]sx?$/, "javascript"])
