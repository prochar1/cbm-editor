import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { cbmExtension, createCbmForm, parseCbm } from "./index.js";
import defaultContent from "../cs.txt?raw";

let syncing = false;

// ¦¦ Form builder ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
const form = createCbmForm(document.getElementById("form-builder"), {
  initialData: parseCbm(defaultContent),
  onChange: (text) => {
    if (syncing) return;
    syncing = true;
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: text },
    });
    syncing = false;
  },
});

// ¦¦ CodeMirror editor ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
const editorView = new EditorView({
  state: EditorState.create({
    doc: defaultContent,
    extensions: [
      basicSetup,
      cbmExtension,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || syncing) return;
        syncing = true;
        form.setState(parseCbm(update.state.doc.toString()));
        syncing = false;
      }),
    ],
  }),
  parent: document.getElementById("editor"),
});

// ¦¦ Download ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
document.getElementById("btn-download").onclick = () => {
  const text = form.serialize();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "content.txt";
  a.click();
  URL.revokeObjectURL(url);
};
