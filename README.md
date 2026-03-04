# codemirror-lang-cbm

[CodeMirror 6](https://codemirror.net/) syntax highlighting for the **CBM (Content Block Markup)** format.

## Installation

```bash
npm install codemirror-lang-cbm
```

These packages are **peer dependencies** – you need to install them in your project too if you haven't already:

```bash
npm install codemirror @codemirror/state @codemirror/view @codemirror/language
```

---

## Usage

```js
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { cbmExtension } from "codemirror-lang-cbm";

new EditorView({
  state: EditorState.create({
    doc: `@id: home
@title: Úvodní stránka

Vítejte v naší **interaktivní expozici**.
`,
    extensions: [basicSetup, cbmExtension],
  }),
  parent: document.getElementById("editor"),
});
```

---

## CBM Format

CBM (Content Block Markup) is a text format for structuring rich content with blocks, attributes, and lists.

### Syntax overview

| Syntax                                             | Meaning                |
| -------------------------------------------------- | ---------------------- |
| `################################################` | Block separator        |
| `@id: value`                                       | Attribute              |
| `@menu: id (Label)`                                | Menu item              |
| `@block: gallery`                                  | Block type declaration |
| `![alt](url)`                                      | Inline image           |
| `**text**`                                         | Bold text              |
| `? Question`                                       | Quiz question          |
| `- (*) Answer`                                     | Correct quiz answer    |
| `- Answer`                                         | Wrong quiz answer      |
| `assets/file.jpg (Caption)`                        | Gallery / list item    |
| `// comment`                                       | Line comment           |

---

## Exports

| Export         | Description                                  |
| -------------- | -------------------------------------------- |
| `cbmExtension` | Ready-to-use CodeMirror 6 extension          |
| `cbmLanguage`  | Raw StreamParser definition for advanced use |

---

## License

MIT
