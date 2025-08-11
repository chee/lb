import {LbMachinePlugin} from "../../machine/machine"

export interface Package {
	name: string
	settings?: Record<string, any>
	commands?: Record<string, (...args: any[]) => any>
	machine?: {
		plugins?: LbMachinePlugin[]
	}
	// trans?: Record<
	// 	string,
	// 	<Input extends IOpstream<any, any>, Output extends IOpstream<any, any>>(
	// 		input: Input
	// 	) => Output
	// >
	// protocols?: Record<string, ProtocolHandler<any>>
	//	keymaps?: Record<string, {new (surface: Surface<any>): Keymap} | ((surf) => Keymap)>
	// vibes?: Record<string, {new (surface: Surface<any>): Vibe} | ((surf) => Vibe)>
	// views?: Record<
	// 	string,
	// 	| {new (surface: Surface<any>): View<any>}
	// 	| ((surface: Surface<any>) => View<any>)
	// >
}

export interface Packages extends Record<string, Package> {}

//export const [packages, updatePackages] = createStore({} as Packages)
export const packages = {} as Packages

export function registerPackage<P extends Package>(pkg: P): P {
	// todo deeply reactive?
	// or settings could be contributed as individual signals?
	// todo of course the graph needs to live outside this world.
	// it must be aware of the text
	// that is to say, if i do `var x = atom(10)`
	// and then later i do `var x = atom(10)`
	// that is the same var. and so is `var x = atom(2)`, that's
	// the same var with a new value. because its name and owner
	// is the same (more realistically, registerPackage({settings: {a}}) twice)
	// updatePackages(pkgs => {
	// 	pkgs[pkg.name] = store[0]
	// })
	// return store
	packages[pkg.name] = pkg
	return pkg
}

export type Command = (...args: any[]) => any
