import events from ":global/events.ts"

// todo frontmatter with that yaml thing from textmagic2.0
import { markdown } from "@codemirror/lang-markdown"
import { yamlFrontmatter } from "@codemirror/lang-yaml"
import debug from ":global/log.ts"
import {
  javascriptLanguage,
  jsxLanguage,
  tsxLanguage,
  typescriptLanguage,
} from "@codemirror/lang-javascript"
import { LanguageDescription } from "@codemirror/language"
const log = debug.extend("markdown-language")

const codeLanguages = {
  jsx: jsxLanguage,
  tsx: tsxLanguage,
  ts: typescriptLanguage,
  typescript: typescriptLanguage,
  js: javascriptLanguage,
  javascript: javascriptLanguage,
  css: LanguageDescription.of({
    name: "css",
    async load() {
      const { css } = await import("@codemirror/lang-css")
      return css()
    },
  }),
} as Record<string, typeof jsxLanguage | LanguageDescription | undefined>

events.once("lb:text-editor-language-registry:installed", () => {
  const lang = "markdown"
  log("installing Markdown language module")
  lb.registries.textEditorLanguage.register(lang, (props) => {
    return {
      name: lang,
      extension: [yamlFrontmatter({
        content: markdown({
          addKeymap: true,
          // todo all that lazy importing stuff from txt/worldwideweb/littlebook
          // todo also all the sans serif stuff -- though that's a minor mode concern maybe
          // todo although that could also be something configurable through CSS
          codeLanguages(source) {
            return codeLanguages[source] ?? null
          },
        }),
      })],
    }
  })
  log("adding pattern")
  lb.registries.textEditorLanguage.addPattern([
    /\.(md|mdown|markdown)?$/,
    lang,
  ])
})
