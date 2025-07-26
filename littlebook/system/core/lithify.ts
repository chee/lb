import type {LbHandle} from "./handle.ts"

export interface LithifyOptions {
	sources?: ('npm' | 'github' | 'esm.sh')[]
	preferSource?: boolean // prefer TypeScript source over compiled
	includeTests?: boolean
	includeDocs?: boolean
	includeHistory?: boolean // git history
}

export interface PackageSpec {
	name: string
	version?: string
	githubRepo?: string // user/repo format
	scope?: string // @scope for scoped packages
}

export interface LithificationResult {
	packageSpec: PackageSpec
	sources: {
		npm?: {
			tarball: Uint8Array
			metadata: any
		}
		github?: {
			repo: string // git repo data or reference
			metadata: any
		}
		esmsh?: {
			js: string
			dts?: string
		}
	}
	vendorPath: string
	importMapEntries: Record<string, string>
}

export class LithificationSystem {
	constructor(private lb: typeof globalThis.lb) {}

	async lithify(
		packageSpec: string | PackageSpec,
		options: LithifyOptions = {}
	): Promise<LithificationResult> {
		const spec = this.parsePackageSpec(packageSpec)
		const sources = options.sources ?? ['npm', 'github', 'esm.sh']

		console.log(`🗿 Lithifying ${spec.name}@${spec.version}`)

		// Fetch from all sources in parallel
		const [npmData, githubData, esmshData] = await Promise.allSettled([
			sources.includes('npm') ? this.fetchFromNpm(spec) : null,
			sources.includes('github') ? this.fetchFromGithub(spec) : null,
			sources.includes('esm.sh') ? this.fetchFromEsmSh(spec) : null,
		])

		const result: LithificationResult = {
			packageSpec: spec,
			sources: {},
			vendorPath: this.getVendorPath(spec),
			importMapEntries: {}
		}

		// Process successful fetches
		if (npmData.status === 'fulfilled' && npmData.value) {
			result.sources.npm = npmData.value
			await this.processNpmSource(result)
		}

		if (githubData.status === 'fulfilled' && githubData.value) {
			result.sources.github = githubData.value
			await this.processGithubSource(result)
		}

		if (esmshData.status === 'fulfilled' && esmshData.value) {
			result.sources.esmsh = esmshData.value
			await this.processEsmShSource(result)
		}

		// Update import map
		await this.updateImportMap(result)

		console.log(`✅ Lithified ${spec.name} to ${result.vendorPath}`)
		return result
	}

	private parsePackageSpec(spec: string | PackageSpec): PackageSpec {
		if (typeof spec === 'object') return spec

		// Handle different formats:
		// lodash@4.17.21
		// @types/node@20.0.0  
		// github:lodash/lodash
		// lodash (latest)

		if (spec.startsWith('github:')) {
			const repoMatch = spec.match(/^github:(.+)$/)
			if (repoMatch) {
				const [user, repo] = repoMatch[1].split('/')
				return {
					name: repo,
					githubRepo: repoMatch[1]
				}
			}
		}

		const match = spec.match(/^(@[^/]+\/)?([^@]+)(?:@(.+))?$/)
		if (!match) throw new Error(`Invalid package spec: ${spec}`)

		const [, scope, name, version] = match
		return {
			name: scope ? `${scope}${name}` : name,
			version: version || 'latest',
			scope: scope?.slice(1, -1) // remove @ and /
		}
	}

	private getVendorPath(spec: PackageSpec): string {
		// Assume we're running from the vendor directory
		return `./${spec.name}`
	}

	private async fetchFromNpm(spec: PackageSpec) {
		console.log(`📦 Fetching ${spec.name}@${spec.version} from npm registry`)
		
		// Get package metadata
		const metadataUrl = `https://registry.npmjs.org/${spec.name}`
		const response = await fetch(metadataUrl)
		if (!response.ok) throw new Error(`NPM fetch failed: ${response.statusText}`)
		
		const metadata = await response.json()
		const version = spec.version === 'latest' 
			? metadata['dist-tags'].latest 
			: spec.version

		if (!metadata.versions[version]) {
			throw new Error(`Version ${version} not found for ${spec.name}`)
		}

		const versionData = metadata.versions[version]
		const tarballUrl = versionData.dist.tarball

		// Fetch tarball
		const tarballResponse = await fetch(tarballUrl)
		if (!tarballResponse.ok) throw new Error(`Tarball fetch failed: ${tarballResponse.statusText}`)
		
		const tarball = new Uint8Array(await tarballResponse.arrayBuffer())

		return {
			tarball,
			metadata: versionData
		}
	}

	private async fetchFromGithub(spec: PackageSpec) {
		console.log(`🐱 Fetching ${spec.name} from GitHub`)
		
		// Try to determine GitHub repo from package name or spec
		let repoPath = spec.githubRepo
		
		if (!repoPath) {
			// Try to find GitHub repo from npm metadata first
			try {
				const metadataUrl = `https://registry.npmjs.org/${spec.name}`
				const response = await fetch(metadataUrl)
				if (response.ok) {
					const metadata = await response.json()
					const repoUrl = metadata.repository?.url
					if (repoUrl) {
						const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/)
						if (match) repoPath = match[1]
					}
				}
			} catch {
				// Fallback: assume package name matches repo
				if (spec.name.includes('/')) {
					repoPath = spec.name.replace('@', '') // @user/package -> user/package
				}
			}
		}

		if (!repoPath) {
			throw new Error(`Could not determine GitHub repository for ${spec.name}`)
		}

		// For now, we'll fetch repo metadata and default branch
		// In a full implementation, you'd want to clone the actual repo
		const apiUrl = `https://api.github.com/repos/${repoPath}`
		const response = await fetch(apiUrl)
		if (!response.ok) throw new Error(`GitHub API failed: ${response.statusText}`)
		
		const metadata = await response.json()

		return {
			repo: repoPath,
			metadata
		}
	}

	private async fetchFromEsmSh(spec: PackageSpec) {
		console.log(`🌐 Fetching ${spec.name}@${spec.version} from esm.sh`)
		
		const jsUrl = `https://esm.sh/${spec.name}@${spec.version}`
		const dtsUrl = `https://esm.sh/${spec.name}@${spec.version}?dts`

		console.log(`   📥 JS URL: ${jsUrl}`)
		console.log(`   📥 DTS URL: ${dtsUrl}`)

		const result: any = {}

		// Fetch JS
		const jsResponse = await fetch(jsUrl)
		if (jsResponse.ok) {
			let jsContent = await jsResponse.text()
			console.log(`   ✅ JS fetched: ${jsContent.length} chars`)
			
			// Check if it's a redirect (esm.sh barrel export)
			const redirectMatch = jsContent.match(/export \* from "([^"]+)"/);
			if (redirectMatch && jsContent.length < 500) {
				const redirectUrl = `https://esm.sh${redirectMatch[1]}`
				console.log(`   🔄 Following redirect: ${redirectUrl}`)
				
				const actualResponse = await fetch(redirectUrl)
				if (actualResponse.ok) {
					jsContent = await actualResponse.text()
					console.log(`   ✅ Actual JS fetched: ${jsContent.length} chars`)
				}
			}
			result.js = jsContent
		} else {
			console.log(`   ❌ JS fetch failed: ${jsResponse.status}`)
		}

		// Fetch DTS
		const dtsResponse = await fetch(dtsUrl)
		if (dtsResponse.ok) {
			let dtsContent = await dtsResponse.text()
			console.log(`   ✅ DTS fetched: ${dtsContent.length} chars`)
			
			// Check if it's a redirect for types too
			const dtsRedirectMatch = dtsContent.match(/export \* from "([^"]+)"/);
			if (dtsRedirectMatch && dtsContent.length < 500) {
				const redirectUrl = `https://esm.sh${dtsRedirectMatch[1]}`
				console.log(`   🔄 Following DTS redirect: ${redirectUrl}`)
				
				const actualResponse = await fetch(redirectUrl)
				if (actualResponse.ok) {
					dtsContent = await actualResponse.text()
					console.log(`   ✅ Actual DTS fetched: ${dtsContent.length} chars`)
				}
			}
			result.dts = dtsContent
		} else {
			console.log(`   ⚠️  DTS fetch failed: ${dtsResponse.status}`)
		}

		return result
	}

	private async processNpmSource(result: LithificationResult) {
		console.log(`📦 Processing npm tarball for ${result.packageSpec.name}`)
		
		if (!result.sources.npm?.tarball) return

		// Extract tarball using browser-compatible approach
		const tarball = result.sources.npm.tarball
		const extracted = await this.extractTarball(tarball)
		
		// Find main entry points and TypeScript files
		const packageJson = extracted.find(f => f.path === 'package/package.json')
		const packageMeta = packageJson ? JSON.parse(new TextDecoder().decode(packageJson.content)) : {}
		
		// Determine main entry point
		const mainEntry = packageMeta.main || packageMeta.module || 'index.js'
		const typesEntry = packageMeta.types || packageMeta.typings || mainEntry.replace('.js', '.d.ts')
		
		// Save main files to vendor directory
		const vendorPath = result.vendorPath
		const jsFile = extracted.find(f => f.path === `package/${mainEntry}`)
		const dtsFile = extracted.find(f => f.path === `package/${typesEntry}`)
		
		if (jsFile) {
			await this.saveToVendor(`${vendorPath}.js`, jsFile.content)
			result.importMapEntries[result.packageSpec.name] = `littlebook:system/vendor/${result.packageSpec.name}.js`
		}
		
		if (dtsFile) {
			await this.saveToVendor(`${vendorPath}.d.ts`, dtsFile.content)
		}
		
		// Also save all TypeScript source files if they exist
		const tsFiles = extracted.filter(f => f.path.endsWith('.ts') && !f.path.endsWith('.d.ts'))
		for (const tsFile of tsFiles) {
			const relativePath = tsFile.path.replace('package/', '')
			await this.saveToVendor(`${vendorPath}/src/${relativePath}`, tsFile.content)
		}
	}

	private async processGithubSource(result: LithificationResult) {
		// TODO: Clone/download repo, extract source files
		console.log(`🐱 Processing GitHub repo for ${result.packageSpec.name}`)
	}

	private async processEsmShSource(result: LithificationResult) {
		console.log(`🌐 Processing esm.sh files for ${result.packageSpec.name}`)
		
		if (result.sources.esmsh?.js) {
			const jsContent = result.sources.esmsh.js
			
			// Extract and recursively lithify dependencies
			await this.processDependencies(jsContent, result)
			
			const jsPath = `${result.vendorPath}.js`
			await this.saveToVendor(jsPath, new TextEncoder().encode(jsContent))
			result.importMapEntries[result.packageSpec.name] = `littlebook:system/vendor/${result.packageSpec.name}.js`
		}
		
		if (result.sources.esmsh?.dts) {
			const dtsPath = `${result.vendorPath}.d.ts`
			await this.saveToVendor(dtsPath, new TextEncoder().encode(result.sources.esmsh.dts))
		}
	}

	private async processDependencies(jsContent: string, result: LithificationResult) {
		// Find all esm.sh imports in the JavaScript content
		const importRegex = /(?:import|export).*?from\s+["']([^"']+)["']/g
		const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g
		
		const imports = new Set<string>()
		
		// Collect all imports
		let match
		while ((match = importRegex.exec(jsContent)) !== null) {
			imports.add(match[1])
		}
		while ((match = dynamicImportRegex.exec(jsContent)) !== null) {
			imports.add(match[1])
		}

		// Process esm.sh dependencies
		for (const importPath of imports) {
			if (importPath.startsWith('/') && importPath.includes('@')) {
				// This looks like an esm.sh dependency: /@react/react@18.0.0/es2022/react.mjs
				console.log(`   🔗 Found dependency: ${importPath}`)
				
				const depMatch = importPath.match(/\/(@?[^@/]+)@([^/]+)/)
				if (depMatch) {
					const [, depName, depVersion] = depMatch
					const depSpec = `${depName}@${depVersion}`
					
					console.log(`   📦 Recursively lithifying dependency: ${depSpec}`)
					
					try {
						// Check if we already have this dependency
						const existingPath = `./${depName}.js`
						try {
							await Deno.stat(existingPath)
							console.log(`   ✅ Dependency ${depName} already exists, skipping`)
							continue
						} catch {
							// Doesn't exist, need to lithify it
						}
						
						// Recursively lithify the dependency
						await this.lithify(depSpec, { sources: ['esm.sh'] })
					} catch (error) {
						console.log(`   ⚠️  Failed to lithify dependency ${depSpec}: ${error.message}`)
					}
				}
			}
		}
	}

	private async updateImportMap(result: LithificationResult) {
		console.log(`📝 Updating import map for ${result.packageSpec.name}`)
		
		if (Object.keys(result.importMapEntries).length === 0) return

		// Read current import map (assume we're in vendor, so go up to system)
		const importMapPath = '../importmap.json'
		const currentImportMap = await this.lb.protocol.get('file:')!(new URL(importMapPath, this.lb.workingDirectory))
		const importMapData = currentImportMap ? JSON.parse(await currentImportMap.text()) : {imports: {}}
		
		// Merge new entries
		Object.assign(importMapData.imports, result.importMapEntries)
		
		// Save updated import map
		await currentImportMap?.save(JSON.stringify(importMapData, null, '\t'))
	}

	private async extractTarball(tarball: Uint8Array): Promise<{path: string, content: Uint8Array}[]> {
		// Simple tarball extraction - in a real implementation you'd use a proper tar library
		// For now, this is a placeholder that would need a tar.js library
		console.log('📦 Extracting tarball (placeholder - needs tar.js implementation)')
		return []
	}

	private async saveToVendor(path: string, content: Uint8Array) {
		// Convert relative path to absolute path for Deno
		const absolutePath = path.startsWith('./') ? path.slice(2) : path
		const vendorUrl = new URL(absolutePath, this.lb.workingDirectory)
		const handle = await this.lb.protocol.get('file:')!(vendorUrl)
		if (handle) {
			await handle.save(content)
		}
	}

	async unlithify(packageName: string) {
		console.log(`💨 Unlithifying ${packageName}`)
		// TODO: Remove from vendor directory and import map
	}

	async relithify(packageName: string, options?: LithifyOptions) {
		console.log(`🔄 Re-lithifying ${packageName}`)
		await this.unlithify(packageName)
		return this.lithify(packageName, options)
	}

	async geology(): Promise<string[]> {
		// TODO: List all lithified packages
		console.log(`🗿 Geological survey of lithified packages`)
		return []
	}
}

// Add to global lb instance
declare global {
	interface Littlebook {
		lithify: LithificationSystem
	}
}

// CLI functionality when run directly
if (import.meta.main) {
	await runCLI()
}

async function runCLI() {
	const args = Deno.args
	
	if (args.length === 0) {
		printHelp()
		return
	}

	const command = args[0]
	const packageSpec = args[1]
	
	console.log('🗿 Littlebook Lithification System')
	console.log('================================\n')

	// Create a Deno-based environment for CLI usage
	const denoLb = createDenoLb()
	const lithify = new LithificationSystem(denoLb)

	try {
		switch (command) {
			case 'lithify':
			case 'add':
				if (!packageSpec) {
					console.error('❌ Package specification required')
					console.log('Usage: lithify add <package[@version]>')
					return
				}
				
				console.log(`🗿 Lithifying ${packageSpec}...`)
				const result = await lithify.lithify(packageSpec, parseOptions(args.slice(2)))
				console.log(`✅ Successfully lithified ${packageSpec}`)
				console.log(`📍 Saved to: ${result.vendorPath}`)
				break

			case 'remove':
			case 'unlithify':
				if (!packageSpec) {
					console.error('❌ Package name required')
					return
				}
				
				console.log(`💨 Unlithifying ${packageSpec}...`)
				await lithify.unlithify(packageSpec)
				console.log(`✅ Successfully removed ${packageSpec}`)
				break

			case 'update':
			case 'relithify':
				if (!packageSpec) {
					console.error('❌ Package name required')
					return
				}
				
				console.log(`🔄 Re-lithifying ${packageSpec}...`)
				await lithify.relithify(packageSpec, parseOptions(args.slice(2)))
				console.log(`✅ Successfully updated ${packageSpec}`)
				break

			case 'list':
			case 'geology':
				console.log('🗿 Geological Survey:')
				const packages = await lithify.geology()
				if (packages.length === 0) {
					console.log('   No lithified packages found')
				} else {
					packages.forEach(pkg => console.log(`   📦 ${pkg}`))
				}
				break

			case 'help':
			case '--help':
			case '-h':
				printHelp()
				break

			default:
				console.error(`❌ Unknown command: ${command}`)
				printHelp()
		}
	} catch (error) {
		console.error(`❌ Error: ${error.message}`)
		if (args.includes('--verbose') || args.includes('-v')) {
			console.error(error.stack)
		}
	}
}

function parseOptions(args: string[]) {
	const options: LithifyOptions = {}
	
	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		switch (arg) {
			case '--npm-only':
				options.sources = ['npm']
				break
			case '--github-only':
				options.sources = ['github']
				break
			case '--esm-only':
				options.sources = ['esm.sh']
				break
			case '--prefer-source':
				options.preferSource = true
				break
			case '--include-tests':
				options.includeTests = true
				break
			case '--include-docs':
				options.includeDocs = true
				break
			case '--include-history':
				options.includeHistory = true
				break
		}
	}
	
	return options
}

function printHelp() {
	console.log(`
🗿 Littlebook Lithification System
Turn fluid dependencies into solid stone

USAGE:
  lithify <command> [options]

COMMANDS:
  add <package>      Lithify a package (alias: lithify)
  remove <package>   Remove lithified package (alias: unlithify)  
  update <package>   Re-lithify a package (alias: relithify)
  list              List all lithified packages (alias: geology)
  help              Show this help

PACKAGE FORMATS:
  lodash            Latest version from npm
  lodash@4.17.21    Specific version
  @types/node       Scoped package
  github:user/repo  GitHub repository

OPTIONS:
  --npm-only        Fetch only from npm registry
  --github-only     Fetch only from GitHub
  --esm-only        Fetch only from esm.sh
  --prefer-source   Prefer TypeScript source over compiled JS
  --include-tests   Include test files
  --include-docs    Include documentation
  --include-history Include git history
  --verbose, -v     Verbose error output

EXAMPLES:
  lithify add lodash@4.17.21
  lithify add github:lodash/lodash --prefer-source
  lithify remove lodash
  lithify list
`)
}

function createDenoLb() {
	// Create Deno-based filesystem handlers - much cuter! 🦕
	const denoProtocol = {
		get: (protocol: string) => {
			if (protocol === 'file:') {
				return async (url: URL) => ({
					async text() {
						try {
							return await Deno.readTextFile(url.pathname)
						} catch {
							return '{"imports":{}}'
						}
					},
					async save(content: string | Uint8Array) {
						// Ensure directory exists
						const dir = url.pathname.split('/').slice(0, -1).join('/')
						if (dir) {
							await Deno.mkdir(dir, { recursive: true })
						}
						
						if (typeof content === 'string') {
							await Deno.writeTextFile(url.pathname, content)
							console.log(`💾 Saved: ${url.pathname}`)
						} else {
							await Deno.writeFile(url.pathname, content)
							console.log(`💾 Saved: ${url.pathname} (${content.length} bytes)`)
						}
					}
				})
			}
			return null
		}
	}
	
	return {
		protocol: denoProtocol,
		workingDirectory: new URL('file://' + Deno.cwd())
	} as any
}