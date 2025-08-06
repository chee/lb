const mimes = {
	txt: "text/plain",
	html: "text/html",
	htm: "text/html",
	css: "text/css",

	js: "application/javascript",
	ts: "application/javascript",
	tsx: "application/javascript",
	mjs: "application/javascript",
	json: "application/json",
	xml: "text/xml",
	csv: "text/csv",
	tsv: "text/tab-separated-values",
	md: "text/markdown",
	rtf: "application/rtf",
	yaml: "text/yaml",
	yml: "text/yaml",

	c: "text/x-c",
	cpp: "text/x-c++",
	cc: "text/x-c++",
	cxx: "text/x-c++",
	h: "text/x-c",
	hpp: "text/x-c++",
	java: "text/x-java-source",
	py: "text/x-python",
	php: "text/x-php",
	rb: "text/x-ruby",
	pl: "text/x-perl",
	sh: "text/x-shellscript",
	sql: "text/x-sql",
	go: "text/x-go",
	rs: "text/x-rust",
	swift: "text/x-swift",
	kt: "text/x-kotlin",
	scala: "text/x-scala",

	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	gif: "image/gif",
	bmp: "image/bmp",
	webp: "image/webp",
	svg: "image/svg+xml",
	ico: "image/x-icon",
	tiff: "image/tiff",
	tif: "image/tiff",
	heic: "image/heic",
	heif: "image/heif",
	avif: "image/avif",

	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4",
	aac: "audio/aac",
	flac: "audio/flac",
	wma: "audio/x-ms-wma",
	opus: "audio/opus",

	mp4: "video/mp4",
	avi: "video/x-msvideo",
	mov: "video/quicktime",
	wmv: "video/x-ms-wmv",
	flv: "video/x-flv",
	webm: "video/webm",
	mkv: "video/x-matroska",
	"3gp": "video/3gpp",
	mpg: "video/mpeg",
	mpeg: "video/mpeg",

	pdf: "application/pdf",
	doc: "application/msword",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xls: "application/vnd.ms-excel",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	ppt: "application/vnd.ms-powerpoint",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	odt: "application/vnd.oasis.opendocument.text",
	ods: "application/vnd.oasis.opendocument.spreadsheet",
	odp: "application/vnd.oasis.opendocument.presentation",

	zip: "application/zip",
	rar: "application/vnd.rar",
	"7z": "application/x-7z-compressed",
	tar: "application/x-tar",
	gz: "application/gzip",
	bz2: "application/x-bzip2",
	xz: "application/x-xz",

	ttf: "font/ttf",
	otf: "font/otf",
	woff: "font/woff",
	woff2: "font/woff2",
	eot: "application/vnd.ms-fontobject",

	exe: "application/vnd.microsoft.portable-executable",
	msi: "application/x-msdownload",
	deb: "application/vnd.debian.binary-package",
	dmg: "application/x-apple-diskimage",
	pkg: "application/x-newton-compatible-pkg",
	apk: "application/vnd.android.package-archive",

	sqlite: "application/vnd.sqlite3",
	db: "application/x-sqlite3",
	parquet: "application/parquet",
	avro: "application/avro",

	wasm: "application/wasm",
	manifest: "text/cache-manifest",
	webmanifest: "application/manifest+json",

	ini: "text/plain",
	conf: "text/plain",
	properties: "text/plain",
	toml: "application/toml",

	bin: "application/octet-stream",
	iso: "application/x-iso9660-image",
	torrent: "application/x-bittorrent",
} as const

type Mimes = typeof mimes
export default mimes
export function mime<Ext extends string>(
	filename: Ext | `${string}.${Ext}`
): Ext extends keyof Mimes ? Mimes[Ext] : Mimes[keyof Mimes] {
	const ext = filename.toLowerCase().substring(filename.lastIndexOf(".") + 1)
	return (mimes[ext as keyof Mimes] ||
		"application/octet-stream") as Ext extends keyof Mimes
		? Mimes[Ext]
		: Mimes[keyof Mimes]
}
