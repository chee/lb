/** @jsxImportSource react */
/** @jsxRuntime automatic */

import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLBaseShape,
} from "tldraw"

type ITldrawSurface = TLBaseShape<
	"surface",
	{
		w: number
		h: number
	}
>

export class tldrawSurface extends BaseBoxShapeUtil<ITldrawSurface> {
	static override type = "surface" as const
	static override props: RecordProps<ITldrawSurface> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): ITldrawSurface["props"] {
		return {
			w: 230,
			h: 230,
		}
	}

	component(shape: ITldrawSurface) {
		return (
			<HTMLContainer
				style={{
					height: shape.props.h,
					width: shape.props.w,
					pointerEvents: "all",
					backgroundColor: "#000",
					overflow: "hidden",
				}}>
				<div
					ref={element => {
						const id = shape.id.slice("shape:".length)
						lb.surfaces.get(id).view.render(element)
					}}></div>
			</HTMLContainer>
		)
	}

	indicator(shape: ITldrawSurface) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
