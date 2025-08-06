import {LbSet} from "/littlebook:system/packages/utility/set.ts"

type EventMap<T> = Record<keyof T, unknown[]>
type Listener<T extends EventMap<any>> = (
	this: LbEmitter<T>,
	...payload: T[keyof T]
) => any

export interface LbEmitter<T extends EventMap<any>> {
	on<K extends keyof T>(event: K, listener: Listener<T>): () => void
	off<K extends keyof T>(event: K, listener: Listener<T>): void
	emit<K extends keyof T>(event: K, ...payload: T[K]): void
}

export function createEmitter<T extends EventMap<T>>(): LbEmitter<T> {
	const listeners = {} as Record<keyof T, LbSet<Listener<T>>>

	return {
		on(event, listener): () => void {
			if (listeners[event]) {
				listeners[event].add(listener)
			} else {
				listeners[event] = new LbSet(listener)
			}
			return () => {
				this.off(event, listener)
			}
		},
		off(event, listener): void {
			if (!listeners[event]) return
			const events = listeners[event]
			events.delete(listener)
		},
		emit(event, ...payload): void {
			if (!listeners[event]) return
			for (const listener of listeners[event]) {
				listener.apply(this, payload)
			}
		},
	}
}
