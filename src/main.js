import "./style.css";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { cbmExtension, createCbmForm, parseCbm } from "./index.js";
import defaultContent from "../cs.txt?raw";

let syncing = false;

// Form builder
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

// CodeMirror editor
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

// Download
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

// Drag & drop
const overlay = document.getElementById("drop-overlay");
let dragCounter = 0;

document.addEventListener("dragenter", (e) => {
  if (!e.dataTransfer?.types.includes("Files")) return;
  dragCounter++;
  overlay.classList.remove("hidden");
});

document.addEventListener("dragleave", () => {
  dragCounter--;
  if (dragCounter <= 0) { dragCounter = 0; overlay.classList.add("hidden"); }
});

document.addEventListener("dragover", (e) => e.preventDefault());

document.addEventListener("drop", async (e) => {
  e.preventDefault();
  dragCounter = 0;
  overlay.classList.add("hidden");
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  if (!file.type.startsWith("text") && !file.name.match(/\.(txt|cbm)$/i)) return;
  const text = await file.text();
  syncing = true;
  editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: text } });
  form.setState(parseCbm(text));
  syncing = false;
});
