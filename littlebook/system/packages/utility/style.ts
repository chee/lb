export async function importStyle(url: URL | string) {
	const style =
		(document.querySelector(
			`style[data-littlebook-css="${url}"]`
		) as HTMLStyleElement) ?? document.createElement("style")
	style.textContent = await (await fetch(url)).text()
	style.dataset.littlebookCss = url.toString()
	document.head.append(style)
	return style
}
