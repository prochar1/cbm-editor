export const cbmLanguage = {
  name: "cbm",
  startState: function () {
    return { inList: false, inMultiLineDesc: false };
  },
  token: function (stream, state) {
    if (stream.eatSpace()) return null;

    if (stream.match(/^\/\/.*/)) return "comment";

    // Modré oddělovače
    if (stream.match(/^#{5,}/)) return "heading";

    // Menu itmes
    if (stream.match(/^@menu:\s/)) {
      stream.skipToEnd();
      return "keyword";
    }

    // Atributy (fialová, např. @id: home)
    if (stream.match(/^@[a-zA-Z0-9_-]+:/)) return "meta";

    // Obrázky
    if (stream.match(/^!\[.*?\]\(.*?\)/)) return "link";

    // Otázky v kvízu
    if (stream.match(/^\? .*/)) return "strong";

    if (stream.match(/^- \(\*\) .*/)) return "string"; // Správná odpověď v kvízu
    if (stream.match(/^- .*/)) return "variableName"; // Špatná odpověď v kvízu

    // Cesty k souborům – s popiskem i bez (galerie, pexeso, audio)
    // Shoduje: assets/foto.jpg (popisek)  nebo  data/audio/zvuk.mp3
    if (stream.match(/^[\w.][\w.\-/]*\/[\w.\-/]+(\s+\([^)]*\))?/))
      return "string";

    // Simple bold markdown
    let ch = stream.next();
    if (ch === "*" && stream.eat("*")) {
      while (!stream.eol()) {
        ch = stream.next();
        if (ch === "*" && stream.eat("*")) return "strong";
      }
      return "strong";
    }

    return null;
  },
};
