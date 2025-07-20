import {defineConfig} from "rolldown"
import dev from "rollup-plugin-dev"
import html, {
	makeHtmlAttributes,
	type RollupHtmlTemplateOptions,
} from "@rollup/plugin-html"
import copy from "rollup-plugin-copy"
import multi from "@rollup/plugin-multi-entry"

export default defineConfig([
	{
		input: [
			"./bookstrap/src/bookstrap.ts",
			"./bookstrap/src/envs/opfs/opfs.ts",
			"./bookstrap/src/envs/opfs/opfs.worker.ts",
			"./bookstrap/src/envs/taurifs/taurifs.ts",
		],
		keepNames: true,
		platform: "browser",
		transform: {},
		output: {
			format: "iife",
			//preserveModules: true,
			sourcemap: true,
			dir: "./dist",
		},
		plugins: [
			dev(),
			// html({
			// 	addScriptsToHead: true,
			// 	template: htmlTemplate,
			// 	title: "Littlebook.",
			// 	attributes: {
			// 		html: {
			// 			lang: "en-CA",
			// 			theme: "lychee",
			// 		},
			// 	},
			// }),
		],
	},
])

async function htmlTemplate(_options: RollupHtmlTemplateOptions) {
	return /*html*/ `<!doctype html>
<html lang="en-CA" theme="lychee">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Littlebook.</title>
<style>html{background:#fcfffe}</style>
<script src="/bookstrap.js"></script>
<script src="/install.js"></script>
<script src="/machine.js"></script>
<body></body>
`
}
