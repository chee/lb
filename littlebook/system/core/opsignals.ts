import {createSignal, Setter} from "@solidjs/signals"
import {apply as cabbagepatch} from "cabbages"

import {Accessor} from "solid-js"
import {createEmitter} from "../packages/utility/emitter.ts"
import {BytesOp, JSONOp, SnapshotOp, TextOp} from "./ops.ts"
export * from "./ops.ts"

export type Agent = string | undefined | symbol

export type OpEvent<Type, OpType> =
	| {
			readonly type: "snapshot"
			readonly op: SnapshotOp<Type>
			readonly before: Type
			readonly after: Type
			readonly agent?: Agent
	  }
	| {
			readonly type: "mutation"
			readonly op: OpType
			readonly before: Type
			readonly after: Type
			readonly agent?: Agent
	  }

export type OpCallback<Type, OpType> = (op: OpEvent<Type, OpType>) => void

export type OpApply<Type, OpType> = (
	prev: Type,
	op: OpType,
	agent?: Agent
) => Type

export type IOpsig<Type, OpType> = {
	get(): Type
	set(value: Type | ((prev: Type) => Type), agent?: Agent): Type
	watch(callback: OpCallback<Type, OpType>): () => void
	mutate(op: OpType, agent?: Agent): Type
}

const OPSIG = Symbol("opsig")

class Opsig<Type, OpType> implements IOpsig<Type, OpType> {
	private _version = 0
	private _apply: OpApply<Type, OpType>
	private _value: Type
	private _track: Accessor<number>
	private _notify: Setter<number>
	private _emitter = createEmitter<{op: Parameters<OpCallback<Type, OpType>>}>()

	constructor(apply: OpApply<Type, OpType>, initialValue: Type) {
		this._apply = apply
		this._value = initialValue
		;[this._track, this._notify] = createSignal(0)
	}
	peep() {
		return this._value
	}
	_snap(prev: Type, agent?: Agent) {
		this._emitter.emit("op", {
			type: "snapshot",
			op: {value: this._value} as SnapshotOp<Type>,
			before: prev,
			after: this._value,
			agent,
		})
	}
	watch(callback: OpCallback<Type, OpType>) {
		this._emitter.on("op", callback)
		this._snap(undefined as Type, OPSIG)
		return () => this._emitter.off("op", callback)
	}
	mutate(ops: OpType | OpType[], agent?: Agent) {
		ops = Array.isArray(ops) ? ops : [ops]
		let prev = this.peep()
		for (const op of ops) {
			this._version++
			this._value = this._apply(prev, op, agent)
			this._emitter.emit("op", {
				type: "mutation",
				op,
				before: prev,
				after: this._value,
				agent,
			})
			prev = this.peep()
		}
		return this._value
	}
	get = () => {
		this._track()
		return this._value
	}
	set = (value: Type | ((prev: Type) => Type), agent?: Agent) => {
		const prev = this.peep()
		const returnValue =
			typeof value == "function"
				? // @ts-expect-error
					value(prev)
				: value
		this._snap(prev, agent)
		this._notify(this._version++)
		return returnValue
	}
}

export type Opsignal<Type, Optype> = ((
	arg?: Type | ((prev: Type) => Type),
	agent?: Agent
) => Type) & {[OPSIG]: IOpsig<Type, Optype>}

export function createOpsignal<Type, OpType>(
	apply: OpApply<Type, OpType>,
	initialValue: Type,
	type: string = "opsignal"
): Opsignal<Type, OpType> {
	const opsig = new Opsig<Type, OpType>(apply, initialValue)
	function opsignal(arg?: Type | ((prev: Type) => Type), agent?: Agent): Type {
		if (arg === undefined) {
			return opsig.get()
		}
		return opsig.set(arg, agent)
	}
	opsignal[OPSIG] = opsig
	opsignal.toString = () => {
		return `[Opsignal ${type}]`
	}
	return opsignal
}

export function createTextOpsignal(initialValue = "") {
	return createOpsignal<string, TextOp>(
		(val, op) => {
			return val.slice(0, op.from) + op.value + val.slice(op.to)
		},
		initialValue,
		"text"
	)
}

export function createBytesOpsignal(initialValue: Uint8Array) {
	return createOpsignal<Uint8Array, BytesOp>(
		(val, op) => {
			val.set(op.value, op.pos)
			return val
		},
		initialValue,
		"bytes"
	)
}

export function createJSONOpsignal<T extends Object>(
	initialValue: T
): Opsignal<T, JSONOp> {
	return createOpsignal<T, JSONOp>(
		(val, op) => {
			cabbagepatch(val, op.path, op.range, op.value)
			return val
		},
		initialValue,
		"json"
	)
}

export function watchOpsignal<T, O>(
	opsignal: Opsignal<T, O>,
	cb: OpCallback<T, O>
) {
	return opsignal[OPSIG].watch(cb)
}

export function mutateOpsignal<T, O>(
	opsignal: Opsignal<T, O>,
	op: O,
	agent?: Agent
) {
	return opsignal[OPSIG].mutate(op, agent)
}
