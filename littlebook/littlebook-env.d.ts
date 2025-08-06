declare module "*.css" {}

declare var __lb: LbPrivate

declare interface LbPrivate {}

declare interface LbPrivate {
	importmap: {
		imports: Record<string, string>
		scopes: Record<string, Record<string, string>>
	}
}
