export class LbSet<T> extends Array<T> {
	add(item: T) {
		const index = this.indexOf(item)
		if (index != -1) {
			const last = this.length - 1
			;[this[index], this[last]] = [this[last], this[index]]
		} else {
			this.push(item)
		}
		return this
	}

	delete(item: T) {
		const index = this.indexOf(item)
		if (index > -1) {
			this[index] = this[this.length - 1]
			this.pop()
		}
		return this
	}

	deleteAt(index: number) {
		this.delete(this.at(index))
		return this
	}

	has(item: T) {
		return this.includes(item)
	}

	peep() {
		return this[this.length - 1]
	}

	clear() {
		this.length = 0
	}
}
