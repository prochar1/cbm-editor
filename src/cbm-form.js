// CBM Form Builder – vytvoří formulářové rozhraní místo textového editoru.
// Použití: createCbmForm(parentElement, { initialData, onChange })
//          parseCbm(text) → state objekt

// ── Parser CBM textu → stav formuláře ────────────────────────────────────────
export function parseCbm(text) {
  const lines = text.split("\n");
  const menus = [];
  const pages = [];
  let i = 0;

  // Menus a prázdné řádky před první stránkou
  while (i < lines.length && !lines[i].match(/^#{5,}/)) {
    const m = lines[i].match(/^@menu:\s+(\S+)\s+\(([^)]*)\)/);
    if (m) menus.push({ id: m[1], label: m[2] });
    i++;
  }

  // Stránky oddělené ####...
  while (i < lines.length) {
    if (!lines[i].match(/^#{5,}/)) {
      i++;
      continue;
    }
    i++; // přeskočit separator

    const page = {
      id: "",
      parentId: "",
      title: "",
      image: "",
      excerpt: "",
      body: "",
      blocks: [],
    };
    const bodyLines = [];
    let block = null;
    let inMultiCap = false;
    let multiCapSrc = "";
    const multiCapLines = [];

    while (i < lines.length && !lines[i].match(/^#{5,}/)) {
      const line = lines[i++];

      // Komentáře
      if (line.match(/^\/\//)) continue;

      // Atributy @key: value
      const attr = line.match(/^@([a-zA-Z0-9_-]+):\s*(.*)/);
      if (attr) {
        const [, key, val] = attr;
        const v = val.trim();
        if (!block) {
          if (key === "id") {
            page.id = v;
            continue;
          }
          if (key === "parentId") {
            page.parentId = v;
            continue;
          }
          if (key === "title") {
            page.title = v;
            continue;
          }
          if (key === "image") {
            page.image = v;
            continue;
          }
          if (key === "excerpt") {
            page.excerpt = v;
            continue;
          }
          if (key === "block") {
            if (v === "gallery") block = { type: "gallery", items: [] };
            else if (v === "audio")
              block = { type: "audio", title: "", src: "" };
            else if (v === "pexeso")
              block = { type: "pexeso", blockId: "", backImage: "", items: [] };
            else if (v === "quiz")
              block = {
                type: "quiz",
                blockId: "",
                questionCount: "",
                questions: [],
              };
            else block = { type: v };
            continue;
          }
        } else {
          if (key === "block") {
            page.blocks.push(block);
            if (v === "gallery") block = { type: "gallery", items: [] };
            else if (v === "audio")
              block = { type: "audio", title: "", src: "" };
            else if (v === "pexeso")
              block = { type: "pexeso", blockId: "", backImage: "", items: [] };
            else if (v === "quiz")
              block = {
                type: "quiz",
                blockId: "",
                questionCount: "",
                questions: [],
              };
            else block = { type: v };
            continue;
          }
          if (key === "title") {
            block.title = v;
            continue;
          }
          if (key === "blockId") {
            block.blockId = v;
            continue;
          }
          if (key === "questionCount") {
            block.questionCount = v;
            continue;
          }
          if (key === "backImage") {
            block.backImage = v;
            continue;
          }
        }
        continue;
      }

      // Prázdný řádek
      if (!line.trim()) {
        if (!block && bodyLines.length > 0) bodyLines.push("");
        continue;
      }

      // Bloky
      if (block) {
        if (block.type === "quiz") {
          const qm = line.match(/^\?\s+(.+)/);
          if (qm) {
            block.questions.push({ text: qm[1].trim(), answers: [] });
            continue;
          }
          const cm = line.match(/^-\s+\(\*\)\s+(.+)/);
          if (cm && block.questions.length) {
            block.questions
              .at(-1)
              .answers.push({ text: cm[1].trim(), correct: true });
            continue;
          }
          const wm = line.match(/^-\s+(.+)/);
          if (wm && block.questions.length) {
            block.questions
              .at(-1)
              .answers.push({ text: wm[1].trim(), correct: false });
            continue;
          }
          continue;
        }

        if (block.type === "gallery" || block.type === "pexeso") {
          // Víceřádkový popisek – začátek
          const ms = line.match(/^(assets\/[^\s]+)\s+\(\s*$/);
          if (ms) {
            inMultiCap = true;
            multiCapSrc = ms[1];
            multiCapLines.length = 0;
            continue;
          }
          if (inMultiCap) {
            if (line.trim() === ")") {
              block.items.push({
                src: multiCapSrc,
                caption: multiCapLines.join(" ").trim(),
              });
              inMultiCap = false;
            } else {
              multiCapLines.push(line.trim());
            }
            continue;
          }
          // Standardní řádek: assets/x.jpg (popis)
          const im = line.match(/^(assets\/[^\s]+)\s+\(([^)]*)\)/);
          if (im) {
            block.items.push({ src: im[1], caption: im[2] });
            continue;
          }
          if (line.match(/^assets\//)) {
            block.items.push({ src: line.trim(), caption: "" });
            continue;
          }
          continue;
        }

        if (block.type === "audio") {
          if (line.match(/^assets\//)) {
            block.src = line.trim();
            continue;
          }
          continue;
        }
        continue;
      }

      // Tělo stránky
      bodyLines.push(line);
    }

    if (block) page.blocks.push(block);

    // Odstranit prázdné řádky na konci těla
    while (bodyLines.length && !bodyLines.at(-1).trim()) bodyLines.pop();
    page.body = bodyLines.join("\n");

    if (page.id || page.title || page.blocks.length) pages.push(page);
  }

  return { menus, pages };
}

// ── Form Builder ─────────────────────────────────────────────────────────────
export function createCbmForm(parent, options = {}) {
  const onChangeCb = options.onChange || null;

  // ── State ──────────────────────────────────────────────────────────────────
  let state = options.initialData
    ? JSON.parse(JSON.stringify(options.initialData))
    : { menus: [], pages: [] };

  let selectedPageIndex = 0;
  let _suppress = false;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function notifyChange() {
    if (_suppress || !onChangeCb) return;
    onChangeCb(serialize(state));
  }

  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function btn(text, cls, onClick) {
    const b = el("button", cls + " cursor-pointer");
    b.type = "button";
    b.textContent = text;
    b.onclick = onClick;
    return b;
  }

  function inp(value, placeholder, cls, onChange) {
    const i = el("input", cls);
    i.value = value;
    i.placeholder = placeholder;
    i.oninput = (e) => onChange(e.target.value);
    return i;
  }

  // ── Update sidebar labels without full re-render ───────────────────────────
  function updateSidebarLabel() {
    const p = state.pages[selectedPageIndex];
    const nameEl = root.querySelector(`[data-page-name="${selectedPageIndex}"]`);
    const idEl = root.querySelector(`[data-page-id-lbl="${selectedPageIndex}"]`);
    if (nameEl) nameEl.textContent = p.title || "(bez názvu)";
    if (idEl) idEl.textContent = p.id ? `#${p.id}` : "";
    // also update main header
    const hdr = root.querySelector("[data-main-header]");
    if (hdr) hdr.textContent = p.title || "(bez názvu)";
  }

  // ── Serialize ──────────────────────────────────────────────────────────────
  function serialize(s) {
    const lines = [];
    for (const m of s.menus) {
      if (m.id.trim()) lines.push(`@menu: ${m.id.trim()} (${m.label.trim()})`);
    }
    lines.push("");
    for (const page of s.pages) {
      lines.push("################################################");
      if (page.id.trim()) lines.push(`@id: ${page.id.trim()}`);
      if (page.parentId.trim()) lines.push(`@parentId: ${page.parentId.trim()}`);
      if (page.title.trim()) lines.push(`@title: ${page.title.trim()}`);
      if (page.image.trim()) lines.push(`@image: ${page.image.trim()}`);
      if (page.excerpt.trim()) lines.push(`@excerpt: ${page.excerpt.trim()}`);
      lines.push("");
      if (page.body.trim()) {
        lines.push(page.body.trim());
        lines.push("");
      }
      for (const block of page.blocks) {
        if (block.type === "gallery") {
          lines.push("@block: gallery");
          for (const item of block.items) {
            if (!item.src.trim()) continue;
            lines.push(`${item.src.trim()} (${item.caption.trim()})`);
          }
          lines.push("");
        } else if (block.type === "audio") {
          lines.push("@block: audio");
          if (block.title?.trim()) lines.push(`@title: ${block.title.trim()}`);
          if (block.src?.trim()) lines.push(block.src.trim());
          lines.push("");
        } else if (block.type === "pexeso") {
          lines.push("@block: pexeso");
          if (block.blockId?.trim()) lines.push(`@blockId: ${block.blockId.trim()}`);
          if (block.backImage?.trim()) lines.push(`@backImage: ${block.backImage.trim()}`);
          for (const item of block.items) {
            if (!item.src.trim()) continue;
            lines.push(`${item.src.trim()} (${item.caption.trim()})`);
          }
          lines.push("");
        } else if (block.type === "quiz") {
          lines.push("@block: quiz");
          if (block.blockId?.trim()) lines.push(`@blockId: ${block.blockId.trim()}`);
          if (block.questionCount?.trim()) lines.push(`@questionCount: ${block.questionCount.trim()}`);
          lines.push("");
          for (const q of block.questions) {
            if (!q.text.trim()) continue;
            lines.push(`? ${q.text.trim()}`);
            for (const a of q.answers) {
              if (!a.text.trim()) continue;
              lines.push(a.correct ? `- (*) ${a.text.trim()}` : `- ${a.text.trim()}`);
            }
            lines.push("");
          }
        }
      }
    }
    return lines.join("\n");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    root.innerHTML = "";
    root.appendChild(renderSidebar());
    root.appendChild(renderMain());
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────
  function renderSidebar() {
    const sidebar = el("div", "w-52 shrink-0 flex flex-col overflow-y-auto bg-white border-r border-slate-200");

    // ── Menu ────────────────────────────────────────────────────────────────
    sidebar.appendChild(sectionLabel("Menu"));

    const menuList = el("ul", "px-2 pb-1 space-y-1");
    state.menus.forEach((m, i) => {
      const li = el("li", "flex items-center gap-1");
      li.appendChild(inp(m.id, "id", "w-16 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400", (v) => { state.menus[i].id = v; notifyChange(); }));
      li.appendChild(inp(m.label, "název", "w-20 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400", (v) => { state.menus[i].label = v; notifyChange(); }));
      li.appendChild(btn("×", "ml-auto text-slate-400 hover:text-red-500 text-base leading-none p-0.5 bg-transparent border-0", () => { state.menus.splice(i, 1); render(); notifyChange(); }));
      menuList.appendChild(li);
    });
    sidebar.appendChild(menuList);
    sidebar.appendChild(btn("+ menu", "mx-2 mb-3 px-2 py-1 text-xs rounded border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-500 transition w-[calc(100%-1rem)]", () => { state.menus.push({ id: "", label: "" }); render(); }));

    // ── Stránky ─────────────────────────────────────────────────────────────
    const pagesLbl = el("div", "px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 pt-3");
    pagesLbl.textContent = "Stránky";
    sidebar.appendChild(pagesLbl);

    const pageList = el("ul", "flex-1");
    state.pages.forEach((p, i) => {
      const isActive = i === selectedPageIndex;
      const li = el("li", isActive
        ? "flex items-center justify-between gap-2 px-3 py-2 border-l-2 border-l-blue-500 bg-blue-50 text-sm font-semibold text-blue-800 cursor-pointer"
        : "flex items-center justify-between gap-2 px-3 py-2 border-l-2 border-l-transparent hover:bg-slate-50 text-sm text-slate-700 cursor-pointer transition-colors");
      const nameSpan = el("span", "flex-1 truncate");
      nameSpan.textContent = p.title || "(bez názvu)";
      nameSpan.dataset.pageName = i;
      const idSpan = el("span", "text-[10px] text-slate-400 shrink-0");
      idSpan.textContent = p.id ? `#${p.id}` : "";
      idSpan.dataset.pageIdLbl = i;
      li.appendChild(nameSpan);
      li.appendChild(idSpan);
      li.onclick = () => { selectedPageIndex = i; render(); };
      pageList.appendChild(li);
    });
    sidebar.appendChild(pageList);

    sidebar.appendChild(btn("+ nová stránka", "m-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition w-[calc(100%-1rem)]", () => {
      state.pages.push({ id: "", parentId: "", title: "", image: "", excerpt: "", body: "", blocks: [] });
      selectedPageIndex = state.pages.length - 1;
      render();
    }));

    return sidebar;
  }

  // ── Main panel ────────────────────────────────────────────────────────────
  function renderMain() {
    const main = el("div", "flex-1 overflow-y-auto bg-white");

    if (state.pages.length === 0) {
      const empty = el("div", "flex items-center justify-center h-full text-sm text-slate-400");
      empty.textContent = "Nejsou žádné stránky. Přidejte první stránku ←";
      main.appendChild(empty);
      return main;
    }

    const page = state.pages[selectedPageIndex];

    // ── Sticky header ────────────────────────────────────────────────────────
    const hdr = el("div", "flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white sticky top-0 z-10 shadow-sm");
    const hdrTitle = el("h2", "text-sm font-semibold text-slate-700 truncate");
    hdrTitle.dataset.mainHeader = "";
    hdrTitle.textContent = page.title || "(bez názvu)";
    hdr.appendChild(hdrTitle);
    hdr.appendChild(btn("🗑 Smazat stránku", "text-xs px-2.5 py-1 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition", () => {
      state.pages.splice(selectedPageIndex, 1);
      selectedPageIndex = Math.max(0, selectedPageIndex - 1);
      render();
      notifyChange();
    }));
    main.appendChild(hdr);

    const content = el("div", "p-5 space-y-6 pb-10");

    // ── Atributy ─────────────────────────────────────────────────────────────
    const attrWrap = el("div");
    attrWrap.appendChild(sectionLabel("Atributy stránky"));
    const grid = el("div", "grid grid-cols-2 gap-3");
    grid.appendChild(field("ID stránky (@id)", page.id, "@id", (v) => {
      page.id = v; updateSidebarLabel(); notifyChange();
    }));
    grid.appendChild(field("Nadřazená stránka (@parentId)", page.parentId, "@parentId", (v) => {
      page.parentId = v; notifyChange();
    }));
    grid.appendChild(field("Název (@title)", page.title, "Název stránky", (v) => {
      page.title = v; updateSidebarLabel(); notifyChange();
    }));
    grid.appendChild(field("Obrázek (@image)", page.image, "assets/foto.jpg", (v) => {
      page.image = v; notifyChange();
    }));
    const excerptField = field("Perex (@excerpt)", page.excerpt, "Krátký popis…", (v) => {
      page.excerpt = v; notifyChange();
    });
    excerptField.classList.add("col-span-2");
    grid.appendChild(excerptField);
    attrWrap.appendChild(grid);
    content.appendChild(attrWrap);

    // ── Tělo stránky ──────────────────────────────────────────────────────────
    const bodyWrap = el("div");
    bodyWrap.appendChild(sectionLabel("Obsah stránky (tělo)"));
    const ta = el("textarea", "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono resize-y min-h-[80px]");
    ta.value = page.body;
    ta.rows = 5;
    ta.placeholder = "Text stránky, podporuje **tučné** a ![](obrázek)";
    ta.oninput = (e) => { page.body = e.target.value; notifyChange(); };
    bodyWrap.appendChild(ta);
    content.appendChild(bodyWrap);

    // ── Bloky ─────────────────────────────────────────────────────────────────
    const blocksWrap = el("div");
    blocksWrap.appendChild(sectionLabel("Bloky (@block)"));
    page.blocks.forEach((block, bi) => {
      blocksWrap.appendChild(renderBlock(page, block, bi));
    });

    const addRow = el("div", "flex items-center gap-2 mt-2");
    const typeSelect = el("select", "px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer");
    [["gallery", "🖼 Galerie"], ["audio", "🔊 Audio"], ["pexeso", "🎴 Pexeso"], ["quiz", "❓ Kvíz"]].forEach(([v, l]) => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = l;
      typeSelect.appendChild(opt);
    });
    const addBlockBtn = btn("+ přidat blok", "px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition", () => {
      page.blocks.push(createDefaultBlock(typeSelect.value));
      render();
      notifyChange();
    });
    addRow.appendChild(typeSelect);
    addRow.appendChild(addBlockBtn);
    blocksWrap.appendChild(addRow);
    content.appendChild(blocksWrap);

    main.appendChild(content);
    return main;
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────
  function sectionLabel(text) {
    const d = el("div", "text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3");
    d.textContent = text;
    return d;
  }

  function field(label, value, placeholder, onChange) {
    const wrap = el("div", "flex flex-col gap-1");
    const lbl = el("label", "text-xs font-semibold text-slate-500");
    lbl.textContent = label;
    const i = el("input", "px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition w-full");
    i.value = value;
    i.placeholder = placeholder;
    i.oninput = (e) => onChange(e.target.value);
    wrap.appendChild(lbl);
    wrap.appendChild(i);
    return wrap;
  }

  // ── Block renderers ───────────────────────────────────────────────────────
  const BLOCK_STYLES = {
    gallery: { card: "border-violet-200",  hdr: "bg-violet-50 border-violet-200",  lbl: "text-violet-700" },
    audio:   { card: "border-amber-200",   hdr: "bg-amber-50 border-amber-200",    lbl: "text-amber-700"  },
    pexeso:  { card: "border-emerald-200", hdr: "bg-emerald-50 border-emerald-200",lbl: "text-emerald-700"},
    quiz:    { card: "border-sky-200",     hdr: "bg-sky-50 border-sky-200",         lbl: "text-sky-700"   },
  };
  const BLOCK_LABELS = { gallery: "🖼 Galerie", audio: "🔊 Audio", pexeso: "🎴 Pexeso", quiz: "❓ Kvíz" };

  function renderBlock(page, block, bi) {
    const s = BLOCK_STYLES[block.type] || { card: "border-slate-200", hdr: "bg-slate-50 border-slate-200", lbl: "text-slate-600" };
    const card = el("div", `rounded-xl border ${s.card} overflow-hidden mb-3 shadow-sm`);

    const hdr = el("div", `flex items-center gap-2 px-3 py-2 border-b ${s.hdr}`);
    const lbl = el("span", `flex-1 text-xs font-bold ${s.lbl}`);
    lbl.textContent = BLOCK_LABELS[block.type] || block.type;
    hdr.appendChild(lbl);
    hdr.appendChild(btn("Odebrat", "text-xs px-2 py-0.5 rounded text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition", () => {
      page.blocks.splice(bi, 1); render(); notifyChange();
    }));
    card.appendChild(hdr);

    const body = el("div", "p-3");
    if (block.type === "gallery") body.appendChild(renderGalleryBlock(block));
    else if (block.type === "audio") body.appendChild(renderAudioBlock(block));
    else if (block.type === "pexeso") body.appendChild(renderPexesoBlock(block));
    else if (block.type === "quiz") body.appendChild(renderQuizBlock(block));
    card.appendChild(body);
    return card;
  }

  function renderGalleryBlock(block) {
    const frag = document.createDocumentFragment();
    frag.appendChild(itemsTable(block.items, ["Soubor (src)", "Popisek"], ["src", "caption"], () => { render(); notifyChange(); }));
    frag.appendChild(btn("+ obrázek", "mt-1 px-2.5 py-1 text-xs rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition", () => {
      block.items.push({ src: "", caption: "" }); render(); notifyChange();
    }));
    return frag;
  }

  function renderAudioBlock(block) {
    const wrap = el("div", "grid grid-cols-2 gap-3");
    wrap.appendChild(field("Název (@title)", block.title || "", "Název záznamu", (v) => { block.title = v; notifyChange(); }));
    wrap.appendChild(field("Soubor (src)", block.src || "", "assets/sound.mp3", (v) => { block.src = v; notifyChange(); }));
    return wrap;
  }

  function renderPexesoBlock(block) {
    const wrap = document.createDocumentFragment();
    const g = el("div", "grid grid-cols-2 gap-3 mb-3");
    g.appendChild(field("@blockId", block.blockId || "", "1", (v) => { block.blockId = v; notifyChange(); }));
    g.appendChild(field("@backImage", block.backImage || "", "assets/back.jpg", (v) => { block.backImage = v; notifyChange(); }));
    wrap.appendChild(g);
    wrap.appendChild(itemsTable(block.items, ["Soubor (src)", "Popisek"], ["src", "caption"], () => { render(); notifyChange(); }));
    wrap.appendChild(btn("+ obrázek", "mt-1 px-2.5 py-1 text-xs rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition", () => {
      block.items.push({ src: "", caption: "" }); render(); notifyChange();
    }));
    return wrap;
  }

  function renderQuizBlock(block) {
    const wrap = document.createDocumentFragment();
    const g = el("div", "grid grid-cols-2 gap-3 mb-3");
    g.appendChild(field("@blockId", block.blockId || "", "1", (v) => { block.blockId = v; notifyChange(); }));
    g.appendChild(field("@questionCount", block.questionCount || "", "5", (v) => { block.questionCount = v; notifyChange(); }));
    wrap.appendChild(g);

    block.questions.forEach((q, qi) => {
      const qCard = el("div", "rounded-lg border border-slate-200 bg-slate-50 p-3 mb-2");
      const qHead = el("div", "flex items-center gap-2 mb-2");
      const qInp = el("input", "flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition");
      qInp.value = q.text;
      qInp.placeholder = `Otázka ${qi + 1}`;
      qInp.oninput = (e) => { q.text = e.target.value; notifyChange(); };
      qHead.appendChild(qInp);
      qHead.appendChild(btn("×", "text-slate-400 hover:text-red-500 text-base leading-none p-0 bg-transparent border-0", () => { block.questions.splice(qi, 1); render(); notifyChange(); }));
      qCard.appendChild(qHead);

      const table = el("table", "w-full text-xs mb-2");
      const tbody = table.createTBody();
      q.answers.forEach((a, ai) => {
        const row = tbody.insertRow();
        row.className = "border-b border-slate-100 last:border-0";
        const tdText = row.insertCell();
        tdText.className = "py-1 pr-2";
        const ainp = el("input", "w-full px-2 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 text-xs");
        ainp.value = a.text;
        ainp.placeholder = "Text odpovědi";
        ainp.oninput = (e) => { a.text = e.target.value; notifyChange(); };
        tdText.appendChild(ainp);

        const tdOk = row.insertCell();
        tdOk.className = "text-center py-1 px-2 w-8";
        const cb = el("input");
        cb.type = "checkbox";
        cb.className = "w-3.5 h-3.5 accent-green-500 cursor-pointer";
        cb.checked = !!a.correct;
        cb.title = "Správná odpověď";
        cb.onchange = (e) => {
          q.answers.forEach((ans) => (ans.correct = false));
          a.correct = e.target.checked;
          notifyChange();
        };
        tdOk.appendChild(cb);

        const tdDel = row.insertCell();
        tdDel.className = "w-6 py-1";
        tdDel.appendChild(btn("×", "text-slate-400 hover:text-red-500 text-base leading-none bg-transparent border-0", () => { q.answers.splice(ai, 1); render(); notifyChange(); }));
      });
      qCard.appendChild(table);
      qCard.appendChild(btn("+ odpověď", "px-2 py-0.5 text-xs rounded border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition", () => {
        q.answers.push({ text: "", correct: false }); render(); notifyChange();
      }));
      wrap.appendChild(qCard);
    });

    wrap.appendChild(btn("+ otázka", "mt-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition", () => {
      block.questions.push({ text: "", answers: [{ text: "", correct: true }, { text: "", correct: false }, { text: "", correct: false }] });
      render(); notifyChange();
    }));
    return wrap;
  }

  function itemsTable(items, headers, keys, onDelete) {
    const wrap = el("div", "overflow-hidden rounded-lg border border-slate-200 mb-2");
    const table = el("table", "w-full text-xs");
    const thead = table.createTHead();
    thead.className = "bg-slate-50";
    const hr = thead.insertRow();
    [...headers, ""].forEach((h) => {
      const th = document.createElement("th");
      th.className = "text-left px-2 py-1.5 text-slate-500 font-semibold border-b border-slate-200 first:pl-3";
      th.textContent = h;
      hr.appendChild(th);
    });
    const tbody = table.createTBody();
    items.forEach((item, i) => {
      const row = tbody.insertRow();
      row.className = "border-b border-slate-100 last:border-0";
      keys.forEach((k) => {
        const td = row.insertCell();
        td.className = "px-1 py-1 first:pl-2";
        const i2 = el("input", "w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white");
        i2.value = item[k];
        i2.placeholder = k;
        i2.oninput = (e) => { item[k] = e.target.value; notifyChange(); };
        td.appendChild(i2);
      });
      const tdDel = row.insertCell();
      tdDel.className = "w-7 px-1 py-1 text-center";
      tdDel.appendChild(btn("×", "text-slate-400 hover:text-red-500 text-base leading-none bg-transparent border-0", onDelete));
    });
    wrap.appendChild(table);
    return wrap;
  }

  function createDefaultBlock(type) {
    if (type === "gallery") return { type: "gallery", items: [{ src: "", caption: "" }] };
    if (type === "audio") return { type: "audio", title: "", src: "" };
    if (type === "pexeso") return { type: "pexeso", blockId: "", backImage: "", items: [{ src: "", caption: "" }] };
    if (type === "quiz") return {
      type: "quiz", blockId: "", questionCount: "5",
      questions: [{ text: "", answers: [{ text: "", correct: true }, { text: "", correct: false }, { text: "", correct: false }] }],
    };
    return { type, items: [] };
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  const root = el("div", "flex h-full min-h-[560px] font-sans text-sm bg-white");
  parent.appendChild(root);
  render();

  return {
    getState: () => JSON.parse(JSON.stringify(state)),
    setState: (newState) => {
      _suppress = true;
      state = JSON.parse(JSON.stringify(newState));
      if (selectedPageIndex >= state.pages.length) selectedPageIndex = Math.max(0, state.pages.length - 1);
      render();
      _suppress = false;
    },
    serialize: () => serialize(state),
  };
}
