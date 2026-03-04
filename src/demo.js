import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { cbmExtension, createCbmForm, parseCbm } from "./index.js";

// ── Sdílený flag proti sync smyčce ─────────────────────────────────────────
let syncing = false;

// ── Textový editor ────────────────────────────────────────────────────────
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

// ── Formulářový builder ────────────────────────────────────────────────────────
const formEl = document.getElementById("form-builder");
const form = formEl
  ? createCbmForm(formEl, {
      initialData: parseCbm(doc),
      onChange: (text) => {
        if (syncing) return;
        syncing = true;
        editorView.dispatch({
          changes: { from: 0, to: editorView.state.doc.length, insert: text },
        });
        syncing = false;
      },
    })
  : null;

// ── Textový editor ────────────────────────────────────────────────────────
const editorElement = document.getElementById("editor");

const editorView = new EditorView({
  state: EditorState.create({
    doc,
    extensions: [
      basicSetup,
      cbmExtension,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || syncing || !form) return;
        syncing = true;
        form.setState(parseCbm(update.state.doc.toString()));
        syncing = false;
      }),
    ],
  }),
  parent: editorElement,
});
