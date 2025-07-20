try {
	defvar("text-editor-languages", {}, "Registered languages for text files")
	set("text-editor-languages.plain", () => [])

	defcmd("text-editor-languages.get", name =>
		get(`text-editor-languages.${name}`)
	)

	defcmd("text-editor-languages.set", (name, language) => {
		set(`text-editor-languages.${name}`, language)
	})

	defcmd("text-editor-languages.clear", () => {
		set("text-editor-languages", {})
	})

	defvar(
		"text-editor-languages.patterns",
		[],
		"Pattern/Name pairs for matching URLs to text editor languages"
	)

	defvar("file-editors", {}, "Registered file editors.")
	defcmd("file-editors.get", name => get(`file-editors.${name}`))
	defcmd("file-editors.set", (name, language) =>
		set(`file-editors.${name}`, language)
	)
	defcmd("file-editors.clear", () => set("file-editors", {}))
	defvar(
		"file-editors.patterns",
		[],
		"Pattern/Name pairs for matching URLs to file editors"
	)
} catch (error) {
	console.error(error)
}
