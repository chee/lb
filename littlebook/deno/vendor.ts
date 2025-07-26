#!/usr/bin/env -S deno run --allow-net --allow-write --allow-read
/// <reference types="deno.ns" />
import {ensureDir} from "https://deno.land/std@0.208.0/fs/mod.ts"
import {join, dirname} from "https://deno.land/std@0.208.0/path/mod.ts"

interface ImportMap {
	imports: Record<string, string>
}

interface DownloadedModule {
	url: string
	localPath: string
	content: string
}

class ModuleVendor {
	private downloadedModules = new Map<string, DownloadedModule>()
	private importMap: ImportMap = {imports: {}}
	private baseDir: string

	constructor(baseDir: string) {
		this.baseDir = baseDir
	}

	async vendor(url: string): Promise<void> {
		console.log(`Starting to vendor: ${url}`)

		const packageName = this.extractPackageName(url)
		const packageDir = join(this.baseDir, packageName.replace("/", "-"))

		await ensureDir(packageDir)
		await this.downloadModule(url, packageDir, packageName)
		await this.writeImportMap()

		console.log(`Vendoring complete. Files saved to: ${this.baseDir}`)
	}

	private extractPackageName(url: string): string {
		const match = url.match(/esm\.sh\/(@?[^@\/]+)/)
		if (!match) throw new Error(`Cannot extract package name from: ${url}`)

		return match[1]
	}

	private async downloadModule(url: string, targetDir: string): Promise<void> {
		if (this.downloadedModules.has(url)) {
			return
		}

		console.log(`Downloading: ${url}`)

		try {
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error(
					`Failed to fetch ${url}: ${response.status} ${response.statusText}`
				)
			}

			const content = await response.text()
			const fileName = this.getFileName(url)
			const localPath = join(targetDir, fileName)

			await ensureDir(dirname(localPath))
			await Deno.writeTextFile(localPath, content)

			this.downloadedModules.set(url, {url, localPath, content})

			// Add to import map (package name as key)
			const packageNameForMap = this.extractPackageName(url)
			const folderName = packageNameForMap.replace("/", "-")
			const relativePath = `./${folderName}/${fileName}`
			this.importMap.imports[packageNameForMap] = relativePath

			// Parse and download dependencies
			await this.processDependencies(content, targetDir)
		} catch (error) {
			console.error(`Error downloading ${url}:`, error.message)
		}
	}

	private async processDependencies(
		content: string,
		baseTargetDir: string
	): Promise<void> {
		// Match import/export statements with paths starting with "/"
		const pathRegex = /(?:import|export).*?from\s+['"`]([^'"`]*\/[^'"`]*)['"`]/g
		const dynamicImportRegex =
			/import\s*\(\s*['"`]([^'"`]*\/[^'"`]*)['"`]\s*\)/g

		const dependencies = new Set<string>()

		let match
		while ((match = pathRegex.exec(content)) !== null) {
			const path = match[1]
			if (path.startsWith("/")) {
				// Convert relative esm.sh path to full URL
				const fullUrl = `https://esm.sh${path}`
				dependencies.add(fullUrl)
			}
		}

		while ((match = dynamicImportRegex.exec(content)) !== null) {
			const path = match[1]
			if (path.startsWith("/")) {
				const fullUrl = `https://esm.sh${path}`
				dependencies.add(fullUrl)
			}
		}

		// Download each dependency
		for (const depUrl of dependencies) {
			const depPackageName = this.extractPackageName(depUrl)
			const depPackageDir = join(dirname(baseTargetDir), depPackageName)

			await ensureDir(depPackageDir)
			await this.downloadModule(depUrl, depPackageDir)
		}
	}

	private getFileName(url: string): string {
		// Extract filename from URL, default to index.js if none
		const urlObj = new URL(url)
		const pathname = urlObj.pathname

		if (pathname.endsWith("/")) {
			return "index.js"
		}

		const segments = pathname.split("/")
		const lastSegment = segments[segments.length - 1]

		// If no extension, assume .js
		if (!lastSegment.includes(".")) {
			return `${lastSegment}.js`
		}

		return lastSegment
	}

	private async writeImportMap(): Promise<void> {
		const importMapContent = JSON.stringify(this.importMap, null, 2)
		console.log("Import map:", importMapContent)
	}
}

async function main(): Promise<void> {
	const args = Deno.args

	if (args.length !== 1) {
		console.error(
			"Usage: deno run --allow-net --allow-write --allow-read vendor.ts <esm.sh-url-or-package-name>"
		)
		Deno.exit(1)
	}

	let url = args[0]

	// If arg doesn't start with http, assume it's a package name
	if (!url.startsWith("http")) {
		url = `https://esm.sh/${url}?target=esnext`
	}

	if (!url.includes("esm.sh")) {
		console.error("Error: URL must be an esm.sh URL")
		Deno.exit(1)
	}

	const vendor = new ModuleVendor("./vendor")
	await vendor.vendor(url)
}

if (import.meta.main) {
	main()
}
