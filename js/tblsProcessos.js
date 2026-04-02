// js/tblsProcessos.js

const STORAGE_KEYS = {
  CSV_TEXT: "csvDataText",
  FOUND: "foundProcessos",
  FOUND_AT: "foundAt"
};

const TABLE_IDS = ["tblProcessosRecebidos", "tblProcessosGerados"];

// ========= util: extração e normalização =========
function extractNumeroProcesso(texto) {
  const m = (texto || "").match(/\d{5}\.\d{6}\/\d{4}-\d{2}/);
  return m ? m[0] : (texto || "");
}

function normalizeNumero(txt) {
  return extractNumeroProcesso(txt)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

// ========= CSV =========
function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

function parseCSV(text) {
  const lines = String(text || "").split(/\r?\n/).filter(l => l.trim() !== "");
  if (!lines.length) return [];

  const headerLine = lines[0].replace(/^\uFEFF/, "");
  const delim = detectDelimiter(headerLine);
  const headers = headerLine.split(delim).map(h => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map(c => c.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] || ""; });
    rows.push(obj);
  }
  return rows;
}

function normalizeMappingsFromCSV(rows) {
  // aceita CSV antigo: numero_processo,tag
  // e novo: numero_processo,tag1,tag2
  return rows.map(r => ({
    numero_processo: r.numero_processo || "",
    tag1: r.tag1 || r.tag || "",
    tag2: r.tag2 || ""
  }));
}

function buildTagMap(mappings) {
  const map = new Map();
  mappings.forEach(r => {
    const key = normalizeNumero(r.numero_processo);
    if (!key) return;
    map.set(key, { tag1: r.tag1 || "", tag2: r.tag2 || "" });
  });
  return map;
}

// ========= DOM: localizar link do processo =========
function getProcessLink(tr) {
  // Ajuste aqui se a coluna mudar em alguma tabela
  return tr.querySelector("td:nth-child(3) a");
}

// ========= coletar foundProcessos =========
function collectFoundProcessos() {
  const set = new Set();

  TABLE_IDS.forEach(tableId => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach(tr => {
      const link = getProcessLink(tr);
      if (!link) return;

      const key = normalizeNumero(link.textContent || "");
      if (key) set.add(key);
    });
  });

  return [...set];
}

// ========= injetar tags =========
function applyTagsToPage(tagMap) {
  TABLE_IDS.forEach(tableId => {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector("tbody");
    if (!tbody) return;

    tbody.querySelectorAll("tr").forEach(tr => {
      const link = getProcessLink(tr);
      if (!link) return;

      const originalText = (link.textContent || "").trim();
      const key = normalizeNumero(originalText);
      if (!key) return;

      const tags = tagMap.get(key);
      if (!tags) return;

      // evita duplicar se rodar várias vezes
      if (link.querySelector(".tag-csv")) return;

      const { tag1, tag2 } = tags;

      const parts = [];

      if (tag2 && tag2.trim() !== "") {
        const span2 = document.createElement("span");
        span2.className = "tag-csv tag2";
        span2.textContent = tag2;
        parts.push(span2);
      }

      const spanNum = document.createElement("span");
      spanNum.className = "numero-processo";
      spanNum.textContent = originalText;
      parts.push(spanNum);

      if (tag1 && tag1.trim() !== "") {
        const span1 = document.createElement("span");
        span1.className = "tag-csv tag1";
        span1.textContent = tag1;
        parts.push(span1);
      }

      // limpa e reinsere nós (sem innerHTML)
      link.textContent = "";
      parts.forEach((node, idx) => {
        if (idx > 0) link.appendChild(document.createTextNode(" "));
        link.appendChild(node);
      });
    });
  });
}

// ========= pipeline principal =========
function run() {
  chrome.storage.local.get([STORAGE_KEYS.CSV_TEXT], data => {
    const csvText = data[STORAGE_KEYS.CSV_TEXT] || "";
    const rows = parseCSV(csvText);
    const mappings = normalizeMappingsFromCSV(rows);
    const tagMap = buildTagMap(mappings);

    // 1) salvar foundProcessos
    const found = collectFoundProcessos();
    chrome.storage.local.set({
      [STORAGE_KEYS.FOUND]: found,
      [STORAGE_KEYS.FOUND_AT]: Date.now()
    });

    // 2) aplicar tags
    applyTagsToPage(tagMap);
  });
}

// ========= observar mudanças na tabela (debounce) =========
function debounce(fn, waitMs) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

const debouncedRun = debounce(run, 250);

const observer = new MutationObserver(() => {
  // qualquer mudança pode exigir reprocessar (SEI costuma mexer em tbody)
  debouncedRun();
});

// inicia
(function init() {
  // roda uma vez
  run();

  // observa mudanças gerais no body (mais simples); se quiser, pode limitar ao container das tabelas
  observer.observe(document.body, { childList: true, subtree: true });
})();
