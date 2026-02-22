/* Configuration dialog for Metric Table.
   Uses:
     - worksheet.getVisualSpecificationAsync() to list current measure fields on "metrics" encoding
     - tableau.extensions.settings to persist per-metric formatting as JSON
*/

let worksheet = null;
let currentMetrics = [];
let selectedFieldId = null;

const DEFAULT_METRIC_FORMAT = {
  title: { bold: true, size: 12, color: "#1f1f1f", bg: "#ffffff" },
  value: { bold: false, size: 12, color: "#1f1f1f", bg: "#ffffff" },
  number: { format: "auto", decimals: 2, prefix: "", suffix: "" }
};

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function getFormats() {
  return safeJsonParse(tableau.extensions.settings.get("metricFormats"), {});
}

function setFormats(obj) {
  tableau.extensions.settings.set("metricFormats", JSON.stringify(obj));
}

function setSaveStatus(msg) {
  document.getElementById("saveStatus").textContent = msg || "";
}

function syncColorInputs(colorInput, textInput) {
  colorInput.addEventListener("input", () => { textInput.value = colorInput.value; });
  textInput.addEventListener("input", () => {
    const v = textInput.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) colorInput.value = v;
  });
}

async function getMetricsFromEncodings() {
  const visualSpec = await worksheet.getVisualSpecificationAsync();
  const marksSpec = visualSpec.marksSpecifications[visualSpec.activeMarksSpecificationIndex];
  const encs = marksSpec.encodings || [];
  return encs.filter(e => e.id === "metrics").map(e => e.field);
}

function renderMetricList(metrics) {
  const list = document.getElementById("metricList");
  list.innerHTML = "";
  metrics.forEach(m => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = m.name || "Measure";
    item.dataset.fieldId = m.fieldId;
    item.addEventListener("click", () => selectMetric(m.fieldId));
    list.appendChild(item);
  });
}

function setActiveListItem(fieldId) {
  document.querySelectorAll(".list-item").forEach(el => {
    el.classList.toggle("active", el.dataset.fieldId === fieldId);
  });
}

function loadForm(fmt) {
  document.getElementById("tBold").checked = !!fmt.title.bold;
  document.getElementById("tSize").value = fmt.title.size ?? 12;
  document.getElementById("tColor").value = fmt.title.color ?? "#1f1f1f";
  document.getElementById("tColorText").value = fmt.title.color ?? "#1f1f1f";
  document.getElementById("tBg").value = fmt.title.bg ?? "#ffffff";
  document.getElementById("tBgText").value = fmt.title.bg ?? "#ffffff";

  document.getElementById("vBold").checked = !!fmt.value.bold;
  document.getElementById("vSize").value = fmt.value.size ?? 12;
  document.getElementById("vColor").value = fmt.value.color ?? "#1f1f1f";
  document.getElementById("vColorText").value = fmt.value.color ?? "#1f1f1f";
  document.getElementById("vBg").value = fmt.value.bg ?? "#ffffff";
  document.getElementById("vBgText").value = fmt.value.bg ?? "#ffffff";

  document.getElementById("nFormat").value = fmt.number.format ?? "auto";
  document.getElementById("nDecimals").value = fmt.number.decimals ?? 2;
  document.getElementById("nPrefix").value = fmt.number.prefix ?? "";
  document.getElementById("nSuffix").value = fmt.number.suffix ?? "";
}

function readForm() {
  const tBold = document.getElementById("tBold").checked;
  const tSize = Number(document.getElementById("tSize").value || 12);
  const tColor = document.getElementById("tColor").value;
  const tBg = document.getElementById("tBg").value;

  const vBold = document.getElementById("vBold").checked;
  const vSize = Number(document.getElementById("vSize").value || 12);
  const vColor = document.getElementById("vColor").value;
  const vBg = document.getElementById("vBg").value;

  const nFormat = document.getElementById("nFormat").value;
  const nDecimals = Number(document.getElementById("nDecimals").value || 0);
  const nPrefix = document.getElementById("nPrefix").value || "";
  const nSuffix = document.getElementById("nSuffix").value || "";

  return {
    title: { bold: tBold, size: tSize, color: tColor, bg: tBg },
    value: { bold: vBold, size: vSize, color: vColor, bg: vBg },
    number: { format: nFormat, decimals: nDecimals, prefix: nPrefix, suffix: nSuffix }
  };
}

function selectMetric(fieldId) {
  selectedFieldId = fieldId;
  setActiveListItem(fieldId);

  const m = currentMetrics.find(x => x.fieldId === fieldId);
  document.getElementById("selectedMetricName").textContent = m?.name || "Metric";

  const formats = getFormats();
  const fmt = formats[fieldId] || DEFAULT_METRIC_FORMAT;
  loadForm(fmt);
  setSaveStatus("");
}

async function save() {
  if (!selectedFieldId) return;
  const formats = getFormats();
  formats[selectedFieldId] = readForm();
  setFormats(formats);
  await tableau.extensions.settings.saveAsync();
  setSaveStatus("Saved.");
}

async function resetMetric() {
  if (!selectedFieldId) return;
  const formats = getFormats();
  delete formats[selectedFieldId];
  setFormats(formats);
  await tableau.extensions.settings.saveAsync();
  selectMetric(selectedFieldId);
  setSaveStatus("Reset to defaults.");
}

async function initDialog() {
  await tableau.extensions.initializeDialogAsync();

  worksheet = tableau.extensions.worksheetContent.worksheet;

  syncColorInputs(document.getElementById("tColor"), document.getElementById("tColorText"));
  syncColorInputs(document.getElementById("tBg"), document.getElementById("tBgText"));
  syncColorInputs(document.getElementById("vColor"), document.getElementById("vColorText"));
  syncColorInputs(document.getElementById("vBg"), document.getElementById("vBgText"));

  document.getElementById("btnSave").addEventListener("click", () => save());
  document.getElementById("btnReset").addEventListener("click", () => resetMetric());
  document.getElementById("btnClose").addEventListener("click", () => tableau.extensions.ui.closeDialog(""));

  currentMetrics = await getMetricsFromEncodings();
  renderMetricList(currentMetrics);

  if (currentMetrics.length) {
    selectMetric(currentMetrics[0].fieldId);
  } else {
    document.getElementById("metricList").innerHTML = "<div class='hint'>No measures found. Add measures to the Metrics tile, then reopen this dialog.</div>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initDialog().catch(err => {
    console.error(err);
    setSaveStatus("Failed to load dialog.");
  });
});
