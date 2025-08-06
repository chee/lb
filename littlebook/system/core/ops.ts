// export const ops = {
// 	snapshot<T>(value: s.Schema<T>) {
// 		return s.schema({value})
// 	},
// 	bytes: s.schema({pos: s.number, value: s.array(s.number)}),
// 	text: s.schema({from: s.number, to: s.number, value: s.string}),
// 	json: s.schema({
// 		path: s.array(s.union([s.string, s.number])),
// 		range: s.union([
// 			s.schema([s.nullable(s.number), s.nullable(s.number)]),
// 			s.string,
// 			s.number,
// 		]),
// 		value: s.any,
// 	}),
// }

export type SnapshotOp<T> = {value: T}
// todo do bytes have ops?
export type BytesOp = {pos: number; value: number[]}
// todo hmm, a string _is_ valid json maybe cabbages should allow the top level
// to be a string or array
export type TextOp = {from: number; to: number; value: string}
export type JSONOp = {
	path: (string | number)[]
	range: [number?, number?] | string | number
	value: any
}
