import {registerPackage} from "littlebook"
import {OnTransformCallback} from "../../../machine/machine.js"

const gleamWASM = await (
	await fetch("/littlebook:system/packages/gleam/gleam_wasm_bg.wasm")
).bytes()

const gleam = await import("./gleam_wasm.js")
gleam.initSync(gleamWASM)
const decoder = new TextDecoder()

const onTransform: OnTransformCallback = input => {
	const moduleName = input.url.split("/").pop()!.replace(".gleam", "")
	const string =
		typeof input.contents == "string"
			? input.contents
			: decoder.decode(input.contents)
	try {
		gleam.write_module(0, moduleName, string)
		gleam.compile_package(0, "javascript")
	} catch (error) {
		console.error(error)
		return {
			contents: `console.error(${error.message})`,
			responseHeaders: {"content-type": "application/javascript"},
		}
	}
	const contents = gleam.read_compiled_javascript(0, moduleName)!
	return {
		contents: contents,
		responseHeaders: {"content-type": "application/javascript"},
	}
}

export function activate() {
	registerPackage({
		name: "gleam",
		machine: {
			plugins: [
				{
					name: "gleam",
					setup(context) {
						context.onTransform({filter: /\.gleam$/}, onTransform)
					},
				},
			],
		},
	})
}
