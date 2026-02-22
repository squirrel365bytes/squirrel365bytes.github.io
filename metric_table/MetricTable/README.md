# Metric Table Viz Extension (Tableau)

This is a **Viz Extension** that renders a table where:
- A **single dimension** dropped on the **Columns** encoding tile becomes the **column headers** (Date recommended).
- One or more **measures** dropped on the **Metrics** encoding tile become **rows**.
- Each metric has **independent formatting** for:
  - Metric title (row label): bold, font size, font color, background
  - Metric values (cells): bold, font size, font color, background
  - Number formatting: auto/number/integer/percent/currency, decimals, prefix, suffix

Under the hood it uses:
- `worksheet.getVisualSpecificationAsync()` to read the fields assigned to encoding tiles.
- `worksheet.getSummaryDataReaderAsync()` to read summary data safely.
- A configuration dialog opened via `tableau.extensions.initializeAsync({ configure })` and `tableau.extensions.ui.displayDialogAsync()`.

## How to run locally
1. Host this folder with a simple web server (example with http-server):
   - `npm install -g http-server`
   - From the parent directory: `http-server -p 8765`
2. Update the `<url>` in `MetricTable.trex` to match where you host `metric-table.html`.
3. In Tableau Desktop (2024.2+), open a worksheet → Marks card → Viz Extensions → Add Extension → Access Local Extensions → select `MetricTable.trex`.

## Notes / limitations (v0.1)
- Currency defaults to USD (extendable).
- Formatting mirrors a subset of Tableau-like controls via the config dialog.
