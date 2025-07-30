// prettier-ignore
export const mod = {
	shift:   0b0001,
	control: 0b0010,
	option:  0b0100,
	super:   0b1000,
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
	event.shiftKey && (bits |= mod.shift)
	event.ctrlKey && (bits |= mod.control)
	event.altKey && (bits |= mod.option)
	event.metaKey && (bits |= mod.super)
	return bits
}
