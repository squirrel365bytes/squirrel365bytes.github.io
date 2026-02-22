/* Metric Table Viz Extension
   - One dimension on Columns encoding becomes the headers
   - Multiple measures on Metrics encoding become table rows
   - Per-metric formatting stored in tableau.extensions.settings

   Uses:
     worksheet.getVisualSpecificationAsync() to understand encodings (field <-> tile mapping)
     worksheet.getSummaryDataReaderAsync() to fetch the current summary data for the worksheet
*/

let worksheet = null;

const DEFAULT_METRIC_FORMAT = {
  title: { bold: true, size: 12, color: "#1f1f1f", bg: "#ffffff" },
  value: { bold: false, size: 12, color: "#1f1f1f", bg: "#ffffff" },
  number: { format: "auto", decimals: 2, prefix: "", suffix: "" }
};

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getSettingsObject() {
  const raw = tableau.extensions.settings.get("metricFormats");
  return safeJsonParse(raw, {});
}

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg || "";
}

function valueToString(val, metricFmt) {
  if (val === null || val === undefined) return "";
  const nFmt = (metricFmt && metricFmt.number) ? metricFmt.number : DEFAULT_METRIC_FORMAT.number;

  const num = (typeof val === "number") ? val : ((typeof val === "string") ? Number(val) : NaN);
  const isNumeric = Number.isFinite(num);

  if (!isNumeric) return String(val);

  const prefix = nFmt.prefix || "";
  const suffix = nFmt.suffix || "";
  const decimals = Number.isFinite(nFmt.decimals) ? Math.max(0, Math.min(6, nFmt.decimals)) : 2;

  let formatted;
  switch (nFmt.format) {
    case "integer":
      formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(num);
      break;
    case "percent":
      formatted = new Intl.NumberFormat(undefined, { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
      break;
    case "currency":
      formatted = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
      break;
    case "number":
      formatted = new Intl.NumberFormat(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
      break;
    case "auto":
    default:
      formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(num);
      break;
  }

  return `${prefix}${formatted}${suffix}`;
}

function applyCellStyle(el, style) {
  if (!el || !style) return;
  el.style.fontWeight = style.bold ? "700" : "400";
  el.style.fontSize = `${style.size || 12}px`;
  el.style.color = style.color || "#1f1f1f";
  el.style.background = style.bg || "#ffffff";
}

async function getEncodings() {
  const visualSpec = await worksheet.getVisualSpecificationAsync();
  const marksSpec = visualSpec.marksSpecifications[visualSpec.activeMarksSpecificationIndex];
  const encs = marksSpec.encodings || [];

  const columns = encs.filter(e => e.id === "columns").map(e => e.field);
  const metrics = encs.filter(e => e.id === "metrics").map(e => e.field);
  return { columns, metrics };
}

async function getSummaryDataAll() {
  const reader = await worksheet.getSummaryDataReaderAsync();
  const table = await reader.getAllPagesAsync();
  await reader.releaseAsync();
  return table;
}

function buildIndexByFieldId(dataTable) {
  const map = new Map();
  dataTable.columns.forEach((c, idx) => {
    if (c.fieldId) map.set(c.fieldId, idx);
  });
  return map;
}

function dataValueToNative(dv) {
  if (!dv) return null;
  if (Object.prototype.hasOwnProperty.call(dv, "value")) return dv.value;
  if (Object.prototype.hasOwnProperty.call(dv, "formattedValue")) return dv.formattedValue;
  return dv;
}

function getFormatted(dv) {
  if (!dv) return "";
  if (Object.prototype.hasOwnProperty.call(dv, "formattedValue") && dv.formattedValue != null) return dv.formattedValue;
  const native = dataValueToNative(dv);
  return native == null ? "" : String(native);
}

function renderEmpty(message) {
  const tbl = document.getElementById("metricTable");
  tbl.innerHTML = "";
  setStatus(message);
}

function renderTable({ headerLabel, colHeaders, metrics, matrix, formats }) {
  const tbl = document.getElementById("metricTable");
  tbl.innerHTML = "";

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");

  const th0 = document.createElement("th");
  th0.textContent = headerLabel || "Metric";
  trh.appendChild(th0);

  colHeaders.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    trh.appendChild(th);
  });

  thead.appendChild(trh);

  const tbody = document.createElement("tbody");
  metrics.forEach((m, rIdx) => {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = m.name || "Measure";
    const mf = formats[m.fieldId] || DEFAULT_METRIC_FORMAT;
    applyCellStyle(tdLabel, mf.title);
    tr.appendChild(tdLabel);

    for (let cIdx = 0; cIdx < colHeaders.length; cIdx++) {
      const td = document.createElement("td");
      const raw = matrix[rIdx][cIdx];
      const native = dataValueToNative(raw);
      td.textContent = valueToString(native, mf);
      applyCellStyle(td, mf.value);
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  });

  tbl.appendChild(thead);
  tbl.appendChild(tbody);
  setStatus("");
}

async function refresh() {
  try {
    const { columns, metrics } = await getEncodings();

    if (!columns.length) {
      renderEmpty("Drop a dimension on the Columns tile to create column headers.");
      return;
    }
    if (!metrics.length) {
      renderEmpty("Drop one or more measures on the Metrics tile to create metric rows.");
      return;
    }

    const colField = columns[0];
    const dataTable = await getSummaryDataAll();
    const idxByFieldId = buildIndexByFieldId(dataTable);

    const colIdx = idxByFieldId.get(colField.fieldId);
    const measureIdxs = metrics.map(m => idxByFieldId.get(m.fieldId));

    if (colIdx === undefined || measureIdxs.some(x => x === undefined)) {
      renderEmpty("Could not match encodings to summary data columns. Try re-adding fields to the encoding tiles.");
      return;
    }

    const colKeys = [];
    const colKeyToPos = new Map();
    dataTable.data.forEach(row => {
      const key = getFormatted(row[colIdx]);
      if (!colKeyToPos.has(key)) {
        colKeyToPos.set(key, colKeys.length);
        colKeys.push(key);
      }
    });

    const matrix = metrics.map(() => Array(colKeys.length).fill(null));

    dataTable.data.forEach(row => {
      const key = getFormatted(row[colIdx]);
      const cPos = colKeyToPos.get(key);
      measureIdxs.forEach((mIdx, rIdx) => {
        matrix[rIdx][cPos] = row[mIdx];
      });
    });

    const stored = getSettingsObject();
    const formats = {};
    metrics.forEach(m => { formats[m.fieldId] = stored[m.fieldId] || DEFAULT_METRIC_FORMAT; });

    renderTable({
      headerLabel: colField.name || "Metric",
      colHeaders: colKeys,
      metrics,
      matrix,
      formats
    });
  } catch (e) {
    console.error(e);
    renderEmpty("Error rendering table. Check the Tableau log / browser console.");
  }
}

async function openConfigDialog() {
  const dlgUrl = window.location.href.replace("metric-table.html", "config.html");
  const options = { height: 720, width: 980 };
  try {
    await tableau.extensions.ui.displayDialogAsync(dlgUrl, "", options);
  } catch (err) {
    // user closed dialog
  }
}

async function init() {
  await tableau.extensions.initializeAsync({ configure: openConfigDialog });

  worksheet = tableau.extensions.worksheetContent.worksheet;

  document.getElementById("btnConfigure").addEventListener("click", openConfigDialog);

  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, refresh);
  worksheet.addEventListener(tableau.TableauEventType.WorksheetFormattingChanged, refresh);
  tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, refresh);

  setStatus("Ready. Drop fields onto the Columns and Metrics tiles on the Marks card.");
  await refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch(err => {
    console.error(err);
    setStatus("Failed to initialize Tableau Extensions API.");
  });
});
