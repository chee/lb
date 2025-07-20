import fs from "fs/promises"
import path from "path"
const host = process.env.LITTLEBOOK_HOST || "desktop"
// console.log(import.meta.dirname)
// const targetDirectory = path.resolve(import.meta.dirname, `../dist/${host}`)
// const littlebookDirectory = path.resolve(import.meta.dirname, "../littlebook")
// const stage0Directory = path.resolve(littlebookDirectory, "boot/stage0")
// const sharedDirectory = path.resolve(stage0Directory, "shared")
// const hostDirectory = path.resolve(stage0Directory, host)

// console.log(`making ${targetDirectory}...`)
// await fs.mkdir(targetDirectory, {recursive: true})
// console.log(`copying ${sharedDirectory} to ${targetDirectory}...`)
// await fs.cp(sharedDirectory, targetDirectory, {recursive: true})
// console.log(`copying ${hostDirectory} to ${targetDirectory}...`)
// await fs.cp(hostDirectory, targetDirectory, {recursive: true})
process.cwd()
import vfs from "./vfs.js"
vfs.packDirectory(littlebookDirectory, `${targetDirectory}/littlebook.json`, {
	exclude: [".wasm$"],
})
