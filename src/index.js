import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { StreamLanguage } from "@codemirror/language";
import { cbmLanguage } from "./cbm-language.js";

// Hotová CodeMirror extension – použití: extensions: [cbmExtension]
export const cbmExtension = StreamLanguage.define(cbmLanguage);

// Přímý přístup k language definici pro pokročilé uživatele
export { cbmLanguage };

// Formulářový builder – alternativa k textovému editoru
export { createCbmForm, parseCbm } from "./cbm-form.js";

const initialText = `@menu: home (Úvod)
@menu: history (Historie)

################################################
@id: home
@title: Úvodní stránka

Vítejte v naší **interaktivní expozici**. Zvolte prosím jednu ze dvou
hlavních kategorií níže
![](assets/1020.jpg)
`;

export function createCbmEditor(parent) {
  const state = EditorState.create({
    doc: initialText,
    extensions: [basicSetup, StreamLanguage.define(cbmLanguage)],
  });

  return new EditorView({
    state,
    parent,
  });
}
