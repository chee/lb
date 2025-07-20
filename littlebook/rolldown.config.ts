import html, {
	makeHtmlAttributes,
	type RollupHtmlTemplateOptions,
} from "@rollup/plugin-html"
import dev from "rollup-plugin-dev"
import replace from "@rollup/plugin-replace"

const outdir = process.env.LITTLEBOOK_OUTDIR || "dist"
const mode = process.env.LITTLEBOOK_MODE || "web"

// todo move things to some kind of @littlebook folder and then fs.readdir to generate this
function importmap() {
	return JSON.stringify(
		{
			imports: {
				littlebook: "/littlebook.js",
			},
		},
		null,
		2
	)
}

const template = async ({
	attributes,
	files,
	meta,
	publicPath,
	title,
	addScriptsToHead,
}: RollupHtmlTemplateOptions) => {
	// Only directly <script>-load entry chunks; others are loaded indirectly
	let scripts = (files.js || [])
		.filter(file => file.type === "chunk" && file.isEntry)
		.map(file => {
			const attrs = makeHtmlAttributes(attributes.script)
			return `<script src="${publicPath}${file.fileName}"${attrs}></script>`
		})
		.join("\n")

	let links = (files.css || [])
		.map(({fileName}) => {
			const attrs = makeHtmlAttributes(attributes.link)
			return `<link href="${publicPath}${fileName}" rel="stylesheet"${attrs}>`
		})
		.join("\n")

	const metas = meta
		.map(input => {
			const attrs = makeHtmlAttributes(input)
			return `<meta${attrs}>`
		})
		.join("\n")

	return `
<!doctype html>
<html${makeHtmlAttributes(attributes.html)}>
  <head>
    ${metas}
    <title>${title}</title>
		<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
		<script type="importmap">
		${importmap()}
		</script>
    ${links}
  </head>
  <body>
    ${scripts}
  </body>
</html>`
}

// todo inject code at bulid time for loading the stdlib
// todo in web mode it'll download the tarball and pop it in opfs
// with a web worker to read/write
// and the location will be opfs://stdlib
// and user config will be opfs://config
export default {
	input: ["./src/littlebook.ts", "./src/styles.css"],
	output: {
		dir: outdir,
		preserveModules: true,
		sourcemap: true,
		format: "esm",
	},
	plugins: [
		dev({
			dirs: [outdir],
			port: 2025,
			silent: false,
			spa: true,
		}),
		html({
			title: "Littlebook.",
			attributes: {html: {lang: "en"}, link: null, script: null},
			meta: [
				{},
				{
					viewport: "width=device-width, initial-scale=1.0",
					"theme-color": "#FFFFFF",
				},
			],
			publicPath: "/",
			template,
		}),
		replace({
			"process.env.LITTLEBOOK_MODE": JSON.stringify(mode),
			"process.env.STDLIB_LOCATION": JSON.stringify(
				// todo per-system
				`file:///${import.meta.resolve("../stdlib/src")}`
			),
		}),
	],
} satisfies import("rolldown").ConfigExport
