import * as acorn from "../vendor/acorn/acorn-loose.js"
import parseStack from "./stack.js"

/**
 * @import Acorn from "../vendor/acorn/acorn.js"
 */

/**
 *  @param {Acorn.Program} ast
 *
 * */
function getFunctionFromProgram(ast) {
	let part = ast.body?.[0]
	if (part?.type == "FunctionDeclaration") {
		return part
	} else if (part?.type == "ExpressionStatement") {
		if (
			part.expression.type == "ArrowFunctionExpression" ||
			part.expression.type == "FunctionExpression"
		) {
			return part.expression
		}
	}
}

/**
 * @typedef {Object} FunctionInfo
 * @property {string} [doc]
 * @property {Acorn.FunctionDeclaration | Acorn.ArrowFunctionExpression | Acorn.FunctionExpression} [ast]
 * @property {string} [source]
 * @property {number} [line]
 * @property {number} [column]
 * @property {string|boolean} [interactive]
 */

/**
 * @param {Function} fn
 * @param {string} stack
 * @returns {FunctionInfo}
 */
export function getFunctionInfo(fn, stack) {
	let info = /** @type {FunctionInfo} */ ({})

	const fnstring = fn.toString()
	const ast = acorn.parse(fnstring, {
		ecmaVersion: "latest",
		sourceType: "module",
	})
	const body = getFunctionFromProgram(ast)
	if (!body) {
		throw new Error(`could not parse as function: ${fnstring}`)
	}

	const [, callee] = parseStack(stack)

	if (callee) {
		info.source = callee.source
		info.line = callee.line
		info.column = callee.column
	}

	if (body.body.type == "BlockStatement") {
		const statements = body.body.body
		const [first, second, third] =
			/** @type {Array<Acorn.EmptyStatement|Acorn.TemplateLiteral|Acorn.Literal|Acorn.ExpressionStatement>} */ (
				statements
			)
		let maybetmpl
		let maybedirective
		// prettier puts a semicolon at the start if the function begins with a template literal
		if (first.type == "EmptyStatement") {
			// @ts-expect-error
			maybetmpl = second?.expression
			third
		} else if (first.type == "Literal") {
			// it doesn't if it begins with a string literal, because that might be "use client"
			maybedirective = first
			// @ts-expect-error
			maybetmpl = second?.expression
		} else {
			// @ts-expect-error
			maybetmpl = first?.expression
			maybedirective = second
		}
		if (maybetmpl && maybetmpl.type == "TemplateLiteral") {
			info.doc = fnstring
				.slice(maybetmpl.start + 1, maybetmpl.end - 1)
				.replace(/(\$\{|\})/g, "`")
				.trim()
		}

		if (
			maybedirective &&
			maybedirective.type == "ExpressionStatement" &&
			maybedirective.expression.type == "Literal"
		) {
			if (typeof maybedirective.expression.value == "string") {
				const [, interactive, interactiveConfig] =
					maybedirective.expression.value.match(/^(interactive)\s*(.*)$/) ?? []
				if (interactive) {
					info.interactive = interactiveConfig ? interactiveConfig.trim() : true
				}
			}
		}
	}

	return info
}
