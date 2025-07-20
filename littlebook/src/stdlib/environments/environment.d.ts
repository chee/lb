type FileType = "file" | "folder" | "link"

declare interface LittlebookFilesystemFileInfo {
	readonly name: string
	readonly type: FileType
	readonly size: number
	readonly accessed: Date | null
	readonly modified: Date | null
	readonly readable: boolean
	readonly writable: boolean
	readonly executable: boolean | null
}

declare interface LittlebookFilesystemFileEntry {
	readonly name: string
	readonly type: FileType
}

declare interface LittlebookFilesystem {
	stat(url: URL): Promise<{
		readonly type: "file" | "directory" | "link"
		readonly size: number
		readonly modified: Date | null
	}>
	read(url: URL): Promise<Uint8Array>
	write(
		url: URL,
		data: Uint8Array,
		opts: {unlessNewerThan?: Date}
	): Promise<void>
	delete?(url: URL, opts: {recursive?: boolean; force?: boolean}): Promise<void>
	mkdir?(url: URL, opts?: {recursive?: boolean}): Promise<void>
	list?(url: URL): Promise<LittlebookFilesystemFile[]>
	move?(
		from: URL,
		to: URL,
		opts?: {force?: boolean; unlessNewerThan?: Date}
	): Promise<void>
	copy?(
		from: URL,
		to: URL,
		opts?: {force?: boolean; unlessNewerThan?: Date}
	): Promise<void>
	watch?: (
		url: URL,
		callback: (event: {type: "create" | "modify" | "delete"}) => void
	) => () => void
}
