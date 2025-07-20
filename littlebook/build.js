import fs from "fs/promises"
import {existsSync} from "fs"
import path from "path"
const host = process.env.LITTLEBOOK_HOST || "tauri"
console.log(import.meta.dirname)
const targetDirectory = path.resolve(import.meta.dirname, `../dist/${host}`)
const bootDirectory = path.resolve(import.meta.dirname, "src/boot/stage0")
const sharedDirectory = path.resolve(bootDirectory, "shared")
const hostDirectory = path.resolve(bootDirectory, host)
//const wait = () => new Promise(resolve => process.stdin.once("data", resolve))

// if (existsSync(targetDirectory)) {
// 	// are you sure?
// 	// console.log(`About to remove ${targetDirectory}`)
// 	// await wait()
// 	await fs.rm(targetDirectory, {recursive: true})
// }
console.log(`making ${targetDirectory}...`)
await fs.mkdir(targetDirectory, {recursive: true})
console.log(`copying ${sharedDirectory} to ${targetDirectory}...`)
await fs.cp(sharedDirectory, targetDirectory, {recursive: true})
console.log(`copying ${hostDirectory} to ${targetDirectory}...`)
await fs.cp(hostDirectory, targetDirectory, {recursive: true})

if (process.argv.includes("-w")) {
}
