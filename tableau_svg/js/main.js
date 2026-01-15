(async function(){
  await tableau.extensions.initializeAsync();
  const root = document.getElementById("vizRoot");
  const btn = document.getElementById("configure");

  btn.onclick = async () => {
    await tableau.extensions.ui.displayDialogAsync("config.html", "", {width:800, height:600});
    render();
  };

  async function render(){
    const svg = tableau.extensions.settings.get("svgTemplate") ||
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100">' +
      '<text x="20" y="50">{{Region}}</text></svg>';

    const ws = tableau.extensions.worksheetContent.worksheet;
    const table = await ws.getSummaryDataAsync();
    const model = buildTemplateModel(table);
    const out = applySvgTemplate(svg, model);
    root.innerHTML = sanitizeSvg(out);
  }

  tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, render);
  render();
})();