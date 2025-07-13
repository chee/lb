import { StyleSpec } from "style-mod"
import { Highlighter } from "@lezer/highlight"
import { Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { syntaxHighlighting } from "@codemirror/language"

export interface TextEditorTheme {
  ui?: { [selector: string]: StyleSpec }
  syntax?: Highlighter
  dark?: boolean
}

/**
 * css plan:
 * user can define a css sheet at ~/.config/lb/styles.css
 * that css sheet can define say
 * ```css
	[theme="my-theme"] {
	--workspace-fill: yellow;
	--workspace-tabs-line: green;
	--syntax-attributeName: blue;
   }
	```
 * we parse the

wait

lol

what if i just have a single codemirror theme, and it uses var(--whatever) for all its values
and then the whole thing can be done with CSS
and also that way you can have per-buffer styles
 */

export function styleSheetToStyleSpec(sheet: CSSStyleSheet): StyleSpec {
  return Object.fromEntries(
    [].map.call(sheet.cssRules, (rule: CSSStyleRule) => {
      if (rule instanceof CSSStyleRule) {
        return [
          rule.selectorText,
          Object.fromEntries(
            Array.from(rule.style).map((prop) => [
              prop,
              rule.style.getPropertyValue(prop),
            ]),
          ),
        ]
      }
    }),
  )
}

// todo expose on edit.
export const themeRegistry = {
  themes: new Map<string, TextEditorTheme>(),
  register(name: string, theme: TextEditorTheme) {
    if (this.themes.has(name)) {
      console.warn(`overwriting theme: "${name}"`)
    }
    this.themes.set(name, theme)
  },
  get(name: string): TextEditorTheme | undefined {
    return this.themes.get(name)
  },
  has(name: string): boolean {
    return this.themes.has(name)
  },
  clear() {
    this.themes.clear()
  },
}

export function themeExtension(
  theme: TextEditorTheme | string | undefined,
): Extension {
  if (typeof theme == "string") {
    theme = themeRegistry.get(theme)!
  }
  if (!theme) {
    console.warn("theme not found")
    return []
  }
  const exts: Extension[] = []
  if (theme.ui) {
    exts.push(EditorView.theme(theme.ui, { dark: theme.dark }))
  }
  if (theme.syntax) {
    exts.push(syntaxHighlighting(theme.syntax))
  }
  return exts
}

/*
this file is now defunct
file/text-editor/import {
  type TextEditorTheme,
  themeExtension,
  themeRegistry,
} from "../themes/themes.ts"

import { lychee } from "../themes/lychee.ts"

themeRegistry.register("lychee", lychee)
 */
