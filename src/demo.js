import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { cbmExtension } from "./index.js";

const doc = `@menu: home (Úvod)
@menu: history (Historie)
@menu: nature (Příroda)

################################################
@id: home
@title: Úvodní stránka

Vítejte v naší **interaktivní expozici**. Zvolte prosím jednu ze dvou
hlavních kategorií níže
![](assets/1020.jpg)

################################################
@id: history
@parentId: home
@title: Historie a pověsti
@image: assets/1020.jpg
@excerpt: Město prošlo mnoha epochami.

@block: gallery
assets/1020.jpg (Údolí)
assets/1021.jpg (Architektura)

################################################
@id: quiz
@parentId: history
@title: Historický kvíz

@block: quiz
@blockId: 3
@questionCount: 5

? Jak se jmenuje nejvyšší hora České republiky?
- (*) Sněžka
- Praděd
- Lysá hora

// Toto je komentář
`;

const editorElement = document.getElementById("editor");

if (editorElement) {
  new EditorView({
    state: EditorState.create({
      doc,
      extensions: [basicSetup, cbmExtension],
    }),
    parent: editorElement,
  });
}
