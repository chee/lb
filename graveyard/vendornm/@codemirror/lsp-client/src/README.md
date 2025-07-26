<!-- NOTE: README.md is generated from src/README.md -->

# @codemirror/lsp-client [![NPM version](https://img.shields.io/npm/v/@codemirror/lsp-client.svg)](https://www.npmjs.org/package/@codemirror/lsp-client)

[ [**WEBSITE**](https://codemirror.net/) | [**ISSUES**](https://github.com/codemirror/dev/issues) | [**FORUM**](https://discuss.codemirror.net/c/v6/) | [**CHANGELOG**](https://github.com/codemirror/lsp-client/blob/main/CHANGELOG.md) ]

This package implements a language server protocol (LSP) client for
the [CodeMirror](https://codemirror.net/) code editor.

The [project page](https://codemirror.net/) has more information, a
number of [examples](https://codemirror.net/examples/) and the
[documentation](https://codemirror.net/docs/).

Note that this code **does not** have a license yet. That should soon
change.

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## Usage

There are various ways to run a language server and connect it to a
web page. You can run it on the server and proxy it through a web
socket, or, if it is written in JavaScript or can be compiled to WASM,
run it directly in the client. The @codemirror/lsp-client package
talks to the server through a ([`Transport`](#lsp-client.Transport))
object, which exposes a small interface for sending and receiving JSON
messages.

Responsibility for how to actually talk to the server, how to connect
and to handle disconnects are left to the code that implements the
transport.

This example uses a crude transport that doesn't handle errors at all.


```javascript
import {Transport, LSPClient, languageServerSupport} from "@codemirror/lsp-client"
import {basicSetup, EditorView} from "codemirror"
import {typescriptLanguage} from "@codemirror/lang-javascript"

function simpleWebSocketTransport(uri: string): Promise<Transport> {
  let handlers: ((value: string) => void)[] = []
  let sock = new WebSocket(uri)
  sock.onmessage = e => { for (let h of handlers) h(e.data.toString()) }
  return new Promise(resolve => {
    sock.onopen = () => resolve({
      send(message: string) { sock.send(message) },
      subscribe(handler: (value: string) => void) { handlers.push(handler) },
      unsubscribe(handler: (value: string) => void) { handlers = handlers.filter(h => h != handler) }
    })
  })
}

let transport = await simpleWebSocketTransport("ws://host:port")
let client = new LSPClient().connect(transport)

new EditorView({
  extensions: [
    basicSetup,
    typescriptLanguage,
    languageServerSupport(client, "file:///some/file.ts"),
  ],
  parent: document.body
})
```

## API Reference

### Client

@LSPClient

@LSPClientConfig

@Transport

@LSPPlugin

@WorkspaceMapping

### Workspaces

@Workspace

@WorkspaceFile

### Extensions

@languageServerSupport

@serverCompletion

@serverCompletionSource

@hoverTooltips

@formatDocument

@formatKeymap

@renameSymbol

@renameKeymap

@signatureHelp

@showSignatureHelp

@nextSignature

@prevSignature

@signatureKeymap

@jumpToDefinition

@jumpToDeclaration

@jumpToTypeDefinition

@jumpToImplementation

@jumpToDefinitionKeymap

@findReferences

@closeReferencePanel

@findReferencesKeymap
