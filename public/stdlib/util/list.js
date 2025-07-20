/**
 * @template T
 * @param {T[]} list
 * @param {T} item
 */
function addToList(list, item) {
	;`Add an ${item} to the front of a ${list}, or move it to the front if it already exists in the list.
Useful for keeping track of recently used items, like files or commands.`
	const index = list.indexOf(item)
	if (index != -1) {
		;[list[index], list[0]] = [list[0], list[index]]
	} else {
		list.unshift(item)
	}
}

console.log("addToList", addToList) // Debugging line, can be removed later

lb.defcmd("add-to-list", addToList)

/**
 * @template T
 * @param {T[]} list
 * @param {T} item
 */
function removeFromList(list, item) {
	;`Remove an ${item} from a ${list}. If the item is not in the list, do nothing.`
	const index = list.indexOf(item)
	if (index > -1) {
		list[index] = list[list.length - 1]
		list.pop()
	}
}

lb.defcmd("remove-from-list", removeFromList)
