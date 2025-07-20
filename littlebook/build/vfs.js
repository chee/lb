#!/usr/bin/env node
// thanks claude lol
import {promises as fs} from "fs"
import {mkdir} from "fs/promises"
import path from "path"

class VFSPackager {
	constructor() {
		this.files = {}
		this.directories = new Set()
	}

	/**
	 *
	 * @param {string} dirPath
	 * @param {string} outputPath
	 * @param {{includeHidden?: boolean, exclude?: string[]}} options
	 */
	async packDirectory(dirPath, outputPath, options = {}) {
		const {includeHidden = false, exclude = []} = options

		try {
			dirPath = new URL(dirPath).pathname
		} catch {}

		console.error(`Packing directory: ${dirPath}`)
		mkdir(path.dirname(outputPath), {recursive: true})

		const rootPath = path.resolve(dirPath)
		const excludePatterns = exclude.map(pattern => new RegExp(pattern))

		await this._walkDirectory(
			rootPath,
			rootPath,
			includeHidden,
			excludePatterns
		)

		const vfs = {
			version: "1.0",
			created: new Date().toISOString(),
			root: path.basename(rootPath),
			directories: Array.from(this.directories).sort(),
			files: this.files,
		}

		const jsonOutput = JSON.stringify(vfs, null, 2)

		if (outputPath) {
			await fs.writeFile(outputPath, jsonOutput)
			const stats = await fs.stat(outputPath)
			console.error(
				`Created VFS: ${outputPath} (${this._formatBytes(stats.size)})`
			)
		} else {
			console.log(jsonOutput)
		}

		console.error(
			`Files: ${Object.keys(this.files).length}, Directories: ${
				this.directories.size
			}`
		)
	}

	async _walkDirectory(currentPath, rootPath, includeHidden, excludePatterns) {
		const entries = await fs.readdir(currentPath, {withFileTypes: true})

		for (const entry of entries) {
			const fullPath = path.join(currentPath, entry.name)
			const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, "/")

			if (!includeHidden && entry.name.startsWith(".")) {
				continue
			}

			if (excludePatterns.some(pattern => pattern.test(relativePath))) {
				continue
			}

			if (entry.isDirectory()) {
				this.directories.add(relativePath)
				await this._walkDirectory(
					fullPath,
					rootPath,
					includeHidden,
					excludePatterns
				)
			} else if (entry.isFile()) {
				const stats = await fs.stat(fullPath)
				const content = await fs.readFile(fullPath, "utf8")

				this.files[relativePath] = {
					size: stats.size,
					modified: stats.mtime.toISOString(),
					content: content,
				}
			}
		}
	}

	_formatBytes(bytes) {
		if (bytes === 0) return "0 Bytes"
		const k = 1024
		const sizes = ["Bytes", "KB", "MB", "GB"]
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
	}
}

// CLI implementation
async function main() {
	const args = process.argv.slice(2)

	if (args.length < 1 || args.includes("--help") || args.includes("-h")) {
		console.log(`
Usage: vfs-pack <input-directory> [output-file.json] [options]

Arguments:
  input-directory      Directory to pack into VFS (text files only)
  output-file.json     Output file (optional, defaults to stdout)

Options:
  --include-hidden     Include hidden files and directories
  --exclude <pattern>  Exclude files matching regex pattern (can be used multiple times)

  --help, -h           Show this help message

Examples:
  vfs-pack ./my-project                           # Output to stdout
  vfs-pack ./my-project project.vfs.json          # Output to file
  vfs-pack ./src > src.vfs.json                   # Redirect stdout to file
  vfs-pack ./src --exclude "node_modules" --exclude "\\.git"
    `)
		process.exit(0)
	}

	const inputDir = args[0]
	let outputFile = null
	let optionStart = 1

	// Check if second argument is an output file (doesn't start with --)
	if (args.length > 1 && !args[1].startsWith("--")) {
		outputFile = args[1]
		optionStart = 2
	}

	const options = {
		includeHidden: false,
		exclude: [],
	}

	// Parse options
	for (let i = optionStart; i < args.length; i++) {
		switch (args[i]) {
			case "--include-hidden":
				options.includeHidden = true
				break
			case "--exclude":
				options.exclude.push(args[++i])
				break
		}
	}

	try {
		const packager = new VFSPackager()
		await packager.packDirectory(inputDir, outputFile, options)
	} catch (error) {
		console.error("Error:", error.message)
		process.exit(1)
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main()
}

export {VFSPackager}
export default new VFSPackager()
