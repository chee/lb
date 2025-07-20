declare module "*.css" {}

declare var __lb_importmap: {
	imports: Record<string, string>
	scopes: Record<string, Record<string, string>>
}

declare var __lb_esbuildPlugins: import("esbuild-wasm").Plugin[]

declare var __lb_bundle: (
	path: string,
	options?: import("esbuild-wasm").BuildOptions
) => Promise<import("esbuild-wasm").BuildResult>
declare var __lb_bundleResult: import("esbuild-wasm").BuildResult
