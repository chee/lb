import {apply as cabbagepatch} from "cabbages"
import {BytesOp, JSONOp, SnapshotOp, TextOp} from "littlebook"
import {createEmitter} from "../packages/utility/emitter.ts"
import Rope from "../packages/utility/rope.ts"
export * from "./ops.ts"

export type IOpstream<Type, OpType> = {
	value: Type
	connect(callback: (event: SnapshotOp<Type> | OpType) => void): () => void
	apply(op: OpType): void
}

type OpEvent<Type, OpType> = SnapshotOp<Type> | OpType

abstract class Opstream<Type, OpType> implements IOpstream<Type, OpType> {
	abstract readonly type: keyof Opstreams
	protected val: Type
	private _version = 0
	emitter = createEmitter<{op: [OpEvent<Type, OpType>, string?]}>()
	constructor(initialValue: Type) {
		this.val = initialValue
	}
	get value() {
		return this.val
	}
	get version() {
		return this._version
	}
	connect(callback: (op: OpEvent<Type, OpType>, agent?: string) => void) {
		this.emitter.on("op", callback)
		callback({type: "snapshot", value: this.value})
		return () => this.emitter.off("op", callback)
	}
	apply(op: OpType, agent?: string) {
		this.emitter.emit("op", op, agent)
		this._version++
	}
}

export class TextOpstream implements IOpstream<string, TextOp> {
	static readonly type = "text" as const
	readonly type = TextOpstream.type
	private rope: Rope
	// todo maybe only use a rope if it's long?
	constructor(initialValue: string) {
		this.rope = new Rope(initialValue)
	}
	get value() {
		return this.rope.toString()
	}
	connect = Opstream.prototype.connect.bind(this)
	apply(op: TextOp) {
		this.rope.del(op.from, op.to)
		op.value && this.rope.insert(op.from, op.value)
	}
}

export class BytesOpstream extends Opstream<Uint8Array, BytesOp> {
	static readonly type = "bytes" as const
	readonly type = BytesOpstream.type
	apply(op: BytesOp) {
		this.val.set(op.value, op.pos)
		super.apply(op)
	}
}

export class JSONOpstream<T> extends Opstream<T, JSONOp> {
	static readonly type = "json" as const
	readonly type = JSONOpstream.type
	apply(op: JSONOp) {
		cabbagepatch(this.val, op.path, op.range, op.value)
		super.apply(op)
	}
}

export const opstreams = {
	text: TextOpstream,
	bytes: BytesOpstream,
	json: JSONOpstream,
}

export type Opstreams = typeof opstreams

export type Snapshots = {
	[K in keyof Opstreams]: InstanceType<Opstreams[K]>["value"]
}

// todo am i conflating edge and vertex? a source here is an edge. the file
// itself is a vertex. a view's inputs and outputs are vertices, and the
// connections between them are edges. is that true? and those connections are
// opstreams?
export interface ISource<Type = unknown>
	extends Omit<IOpstream<Type, SnapshotOp<Type>>, "apply"> {}

export class Source<Type = unknown> implements ISource<Type> {
	protected val: Type
	constructor(value: Type) {
		this.val = value
	}
	get value() {
		return this.val
	}
	connect = Opstream.prototype.connect.bind(this)
}
