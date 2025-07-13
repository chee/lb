// import { KeyBinding } from "@codemirror/view"
// import { Extension } from "@codemirror/state"

// export interface MinorMode {
//   activate(): void
//   deactivate(): void
// }

// export interface MajorMode<Content> {}

// export abstract class MajorMode<Content> implements MajorMode {
//   public static hooks = []
//   public abstract readonly name: string
//   public abstract readonly description: string
//   public modes: MinorMode[] = []
//   public abstract setup(url: URL): Promise<void>
//   public abstract teardown(): Promise<void>
//   public abstract render(): void
//   abstract content?: Content
// }

// export class FileMode<Content extends Uint8Array | string>
//   extends MajorMode<Content> {
//   name = "file"
//   description = "the fallback mode for files"
//   content = undefined
//   override async setup(url: URL) {
//   }
//   render() {
//   }
// }

// export class TextMode extends FileMode<string> {
//   override name = "text"
//   override description = "edit text files"
//   get extension() {
//     return []
//   }
//   override async setup(url: URL) {
//   }
// }
