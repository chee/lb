export class List<T> {
	size = 0
	constructor(public items: T[] = []) {
		this.find = this.items.find.bind(this.items)
		this.size = this.items.length
	}

	find: typeof this.items.find

	at(index: number) {
		return this.items[index]
	}

	add(item: T) {
		const index = this.items.indexOf(item)
		if (index != -1) {
			const last = this.size - 1
			;[this.items[index], this.items[last]] = [
				this.items[last],
				this.items[index],
			]
		} else {
			this.items.push(item)
			this.size += 1
		}
	}

	delete(item: T) {
		const index = this.items.indexOf(item)
		if (index > -1) {
			this.items[index] = this.items[this.size - 1]
			this.items.pop()
			this.size -= 1
		}
	}

	deleteAt(index: number) {
		this.delete(this.at(index))
	}

	has(item: T) {
		return this.items.includes(item)
	}

	pop() {
		const item = this.items.pop()
		this.size = Math.max(0, this.size - 1)
		return item
	}

	peep() {
		return this.items[this.size - 1]
	}

	clear() {
		this.items.length = 0
		this.size = 0
	}
}
