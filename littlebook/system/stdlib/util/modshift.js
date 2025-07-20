export const mod = {
	shift: 1,
	control: 2,
	option: 3,
	super: 4,
}

export const only = {
	shift: 1 << mod.shift,
	control: 1 << mod.control,
	option: 1 << mod.option,
	super: 1 << mod.super,
}

/**
 * @param {{
 *   ctrlKey: boolean
 *   shiftKey: boolean
 *   altKey: boolean
 *   metaKey: boolean
 * }} event
 *
 * @returns {number}
 */
export function modshift(event) {
	let bits = 0
	bits |= +event.shiftKey << mod.shift
	bits |= +event.ctrlKey << mod.control
	bits |= +event.altKey << mod.option
	bits |= +event.metaKey << mod.super
	return bits
}
