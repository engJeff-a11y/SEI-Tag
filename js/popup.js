// popup.js
// Requer no popup.html: csvFile, status, btnExportar, btnSalvar, tabelaContainer.

const STORAGE_KEYS = {
  CSV_TEXT: "csvDataText",
  FOUND: "foundProcessos"
};

// ========= util: normalização e extração =========
function extractNumeroProcesso(texto) {
  // Ajuste o regex se seu padrão variar.
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

function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

// ========= CSV parse/serialize (simples) =========
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

function escapeCsvValue(v) {
  const s = String(v ?? "");
  // padrão seguro: sempre aspas + escape de aspas
  return `"${s.replace(/"/g, '""')}"`;
}

function buildCSVFromMappings(mappings, includeStatus = true) {
  // Sempre exporta em formato novo: numero_processo,tag1,tag2,status
  const headers = includeStatus
    ? ["numero_processo", "tag1", "tag2", "status"]
    : ["numero_processo", "tag1", "tag2"];

  const out = [headers.join(",")];

  mappings.forEach(r => {
    const row = [
      escapeCsvValue(r.numero_processo || ""),
      escapeCsvValue(r.tag1 || ""),
      escapeCsvValue(r.tag2 || "")
    ];

    if (includeStatus) row.push(escapeCsvValue(r.status || ""));
    out.push(row.join(","));
  });

  return out.join("\n");
}

// ========= estado em memória =========
let allMappings = [];      // tudo do CSV (para salvar/exportar)
let activeMappings = [];   // subset ativos (encontrados na página)
let visibleMappings = [];  // ativos + filtros
let foundSet = new Set();

const filtros = { numero_processo: "", tag1: "", tag2: "" };

// ========= DOM =========
function el(id) {
  return document.getElementById(id);
}

function setStatus(msg) {
  const s = el("status");
  if (s) s.textContent = msg;
}

// ========= carga =========
async function storageGet(keys) {
  // Promisify simples (Chrome moderno aceita promise em muitos contextos, mas manter compatível)
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

async function storageSet(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}

function normalizeMappingsFromCSV(rows) {
  // Aceita CSV antigo: numero_processo,tag
  // e novo: numero_processo,tag1,tag2
  return rows.map(r => ({
    numero_processo: r.numero_processo || "",
    tag1: r.tag1 || r.tag || "",
    tag2: r.tag2 || ""
  }));
}

function computeActiveAndVisible() {
  // ativos = aqueles cujo numero está no foundSet
  activeMappings = allMappings
    .map(r => ({ ...r }))
    .filter(r => foundSet.has(normalizeNumero(r.numero_processo)))
    .map(r => ({ ...r, status: "ativo" }));

  const fNum = filtros.numero_processo.toLowerCase();
  const fT1 = filtros.tag1.toLowerCase();
  const fT2 = filtros.tag2.toLowerCase();

  visibleMappings = activeMappings.filter(r => {
    const num = (r.numero_processo || "").toLowerCase();
    const t1 = (r.tag1 || "").toLowerCase();
    const t2 = (r.tag2 || "").toLowerCase();
    return num.includes(fNum) && t1.includes(fT1) && t2.includes(fT2);
  });
}

// ========= render =========
let tableEls = null; // { table, thead, tbody, fNum, fT1, fT2 }

function renderTabelaEstrutura() {
  const container = el("tabelaContainer");
  if (!container) return;

  container.innerHTML = "";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  // header
  const trHead = document.createElement("tr");
  ["Número do processo", "tag1 (depois)", "tag2 (antes)"].forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  // filtros
  const trFilters = document.createElement("tr");

  const mkFilter = (placeholder, value) => {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = value || "";
    return input;
  };

  const thNum = document.createElement("th");
  const fNum = mkFilter("Filtrar número", filtros.numero_processo);
  thNum.appendChild(fNum);

  const thT1 = document.createElement("th");
  const fT1 = mkFilter("Filtrar tag1", filtros.tag1);
  thT1.appendChild(fT1);

  const thT2 = document.createElement("th");
  const fT2 = mkFilter("Filtrar tag2", filtros.tag2);
  thT2.appendChild(fT2);

  trFilters.appendChild(thNum);
  trFilters.appendChild(thT1);
  trFilters.appendChild(thT2);
  thead.appendChild(trFilters);

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);

  const onFilter = () => {
    filtros.numero_processo = fNum.value;
    filtros.tag1 = fT1.value;
    filtros.tag2 = fT2.value;
    computeActiveAndVisible();
    renderTabelaBody(); // <- só corpo
  };

  fNum.addEventListener("input", onFilter);
  fT1.addEventListener("input", onFilter);
  fT2.addEventListener("input", onFilter);

  tableEls = { table, thead, tbody, fNum, fT1, fT2 };
}

function renderTabelaBody() {
  if (!tableEls) renderTabelaEstrutura();
  if (!tableEls) return;

  const { tbody } = tableEls;
  tbody.innerHTML = "";

  if (!visibleMappings.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.textContent = "Nenhum processo ativo para exibir (ou filtros sem resultado).";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  visibleMappings.forEach((row, idxVis) => {
    const tr = document.createElement("tr");

    const tdNum = document.createElement("td");
    tdNum.className = "numero";
    tdNum.textContent = row.numero_processo || "";
    tr.appendChild(tdNum);

    const tdT1 = document.createElement("td");
    const inpT1 = document.createElement("input");
    inpT1.type = "text";
    inpT1.value = row.tag1 || "";
    inpT1.dataset.idxVis = String(idxVis);
    inpT1.dataset.field = "tag1";
    tdT1.appendChild(inpT1);
    tr.appendChild(tdT1);

    const tdT2 = document.createElement("td");
    const inpT2 = document.createElement("input");
    inpT2.type = "text";
    inpT2.value = row.tag2 || "";
    inpT2.dataset.idxVis = String(idxVis);
    inpT2.dataset.field = "tag2";
    tdT2.appendChild(inpT2);
    tr.appendChild(tdT2);

    // listeners de edição (por linha)
    const onEdit = (e) => {
      const input = e.target;
      const idx = Number(input.dataset.idxVis);
      const field = input.dataset.field;
      if (!Number.isFinite(idx) || (field !== "tag1" && field !== "tag2")) return;

      visibleMappings[idx][field] = input.value;

      const key = normalizeNumero(visibleMappings[idx].numero_processo);

      const targetActive = activeMappings.find(r => normalizeNumero(r.numero_processo) === key);
      if (targetActive) targetActive[field] = input.value;

      const targetAll = allMappings.find(r => normalizeNumero(r.numero_processo) === key);
      if (targetAll) targetAll[field] = input.value;
    };

    inpT1.addEventListener("input", onEdit);
    inpT2.addEventListener("input", onEdit);

    tbody.appendChild(tr);
  });
}

// ========= ações (salvar/exportar) =========
async function saveCSVToStorage() {
  // Salvar no storage sem status (csvDataText usado pelo content script)
  const csvText = buildCSVFromMappings(
    allMappings.map(r => ({ numero_processo: r.numero_processo, tag1: r.tag1, tag2: r.tag2 })),
    false
  );
  await storageSet({ [STORAGE_KEYS.CSV_TEXT]: csvText });
  setStatus(`Salvo. Linhas CSV: ${allMappings.length} | Ativos na página: ${foundSet.size}`);
}

function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// Exporta SOMENTE ativos, com status=ativo (como você vinha pedindo na lista do popup)
function exportActiveCSV() {
  const csvText = buildCSVFromMappings(
    activeMappings.map(r => ({
      numero_processo: r.numero_processo,
      tag1: r.tag1,
      tag2: r.tag2,
      status: "ativo"
    })),
    true
  );
  downloadCSV("processos-tags-ativos.csv", csvText);
}

// ========= upload =========
async function onFileSelected(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    const csvText = String(reader.result || "");
    await storageSet({ [STORAGE_KEYS.CSV_TEXT]: csvText });
    await loadAndRender();
  };
  reader.readAsText(file, "UTF-8");
}

// ========= Novo Processo =========
function openNovoProcessoModal() {
  // remove se já existir
  const old = document.getElementById("novoProcessoModal");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "novoProcessoModal";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.35)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const box = document.createElement("div");
  box.style.background = "#fff";
  box.style.padding = "10px";
  box.style.width = "900px";
  box.style.maxWidth = "95vw";
  box.style.maxHeight = "85vh";
  box.style.overflow = "auto";

  const title = document.createElement("h3");
  title.textContent = "Adicionar processos (lote)";
  box.appendChild(title);

  const tbl = document.createElement("table");
  tbl.style.width = "100%";
  tbl.innerHTML = `
    <thead>
      <tr>
        <th>Número do processo</th>
        <th>Tag1</th>
        <th>Tag2</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tb = tbl.querySelector("tbody");

  for (let i = 0; i < 10; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" data-field="numero_processo" data-row="${i}"></td>
      <td><input type="text" data-field="tag1" data-row="${i}"></td>
      <td><input type="text" data-field="tag2" data-row="${i}"></td>
    `;
    tb.appendChild(tr);
  }

  box.appendChild(tbl);

  const actions = document.createElement("div");
  actions.style.marginTop = "10px";

  const btnCancelar = document.createElement("button");
  btnCancelar.type = "button";
  btnCancelar.textContent = "Cancelar";
  btnCancelar.addEventListener("click", () => overlay.remove());

  const btnAdicionar = document.createElement("button");
  btnAdicionar.type = "button";
  btnAdicionar.textContent = "Adicionar ao CSV";
  btnAdicionar.style.marginLeft = "8px";
  btnAdicionar.addEventListener("click", async () => {
    const novos = readNovoProcessoInputs(overlay);
    await mergeNovosProcessos(novos); // Parte 3
    overlay.remove();
  });

  actions.appendChild(btnCancelar);
  actions.appendChild(btnAdicionar);
  box.appendChild(actions);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function readNovoProcessoInputs(modalRoot) {
  const inputs = [...modalRoot.querySelectorAll("input[data-field]")];
  const byRow = new Map();

  inputs.forEach(inp => {
    const row = Number(inp.dataset.row);
    const field = inp.dataset.field;
    if (!byRow.has(row)) byRow.set(row, { numero_processo: "", tag1: "", tag2: "" });
    byRow.get(row)[field] = inp.value.trim();
  });

  // transforma em lista, remove linhas vazias
  const rows = [...byRow.values()]
    .map(r => ({
      numero_processo: r.numero_processo,
      tag1: r.tag1,
      tag2: r.tag2
    }))
    .filter(r => r.numero_processo !== "");

  return rows;
}

// ========= Incorporacao novo processo =========
async function mergeNovosProcessos(novos) {
  if (!Array.isArray(novos) || novos.length === 0) return;

  // validação simples do número (mesma regex usada no normalize)
  const validos = novos.filter(r => normalizeNumero(r.numero_processo) !== "");
  if (!validos.length) return;

  // Indexa os existentes
  const map = new Map();
  allMappings.forEach(r => {
    const key = normalizeNumero(r.numero_processo);
    if (key) map.set(key, { ...r });
  });

  // Mescla/insere
  validos.forEach(r => {
    const key = normalizeNumero(r.numero_processo);
    if (!key) return;

    const existing = map.get(key) || { numero_processo: r.numero_processo, tag1: "", tag2: "" };
    map.set(key, {
      numero_processo: existing.numero_processo || r.numero_processo,
      tag1: r.tag1 ?? existing.tag1 ?? "",
      tag2: r.tag2 ?? existing.tag2 ?? ""
    });
  });

  // Volta para array (base completa)
  allMappings = [...map.values()];

  // Recalcula ativos + visíveis e atualiza tela
  computeActiveAndVisible();
  renderTabelaBody(); // (assumindo que você aplicou a correção de re-render só do tbody)

  // Persiste no storage como csvDataText (sem status)
  await saveCSVToStorage();
}

// ========= bootstrap =========
async function loadAndRender() {
  const data = await storageGet([STORAGE_KEYS.CSV_TEXT, STORAGE_KEYS.FOUND]);

  const csvText = data[STORAGE_KEYS.CSV_TEXT] || "";
  const rows = parseCSV(csvText);
  allMappings = normalizeMappingsFromCSV(rows);

  foundSet = new Set((data[STORAGE_KEYS.FOUND] || []).map(x => (x || "").toLowerCase()));

  computeActiveAndVisible();

  setStatus(`CSV linhas: ${allMappings.length} | Encontrados na página: ${foundSet.size} | Listando: ${visibleMappings.length}`);
  renderTabelaEstrutura();
  renderTabelaBody();

  // habilitar/desabilitar botões
  const hasCsv = allMappings.length > 0;
  const hasActive = activeMappings.length > 0;

  const btnSalvar = el("btnSalvar");
  const btnExportar = el("btnExportar");
  if (btnSalvar) btnSalvar.disabled = !hasCsv;
  if (btnExportar) btnExportar.disabled = !hasActive;
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = el("csvFile");
  const btnSalvar = el("btnSalvar");
  const btnExportar = el("btnExportar");
  const btnNovoProcesso = el("btnNovoProcesso");
  const btnOpenWindow = document.getElementById("btnOpenWindow");

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) onFileSelected(file);
    });
  }

  if (btnSalvar) {
    btnSalvar.addEventListener("click", () => {
      saveCSVToStorage();
    });
  }

  if (btnExportar) {
    btnExportar.addEventListener("click", () => {
      exportActiveCSV();
    });
  }
  
  if (btnNovoProcesso) {
  btnNovoProcesso.addEventListener("click", () => {
    openNovoProcessoModal(); // vamos criar na Parte 2
  });
  }
  
  if (btnOpenWindow) {
    btnOpenWindow.addEventListener("click", () => {
      chrome.windows.create({
        url: chrome.runtime.getURL("popuppage.html"),
        type: "popup",
        width: 900,
        height: 700,
        focused: true
      });
  window.close(); // fecha o popup pequeno após abrir a janela
  });
  }
 
  loadAndRender();
  
});