(async function(){
  await tableau.extensions.initializeDialogAsync();
  const ta = document.getElementById("svgText");
  ta.value = tableau.extensions.settings.get("svgTemplate") || "";
  document.getElementById("save").onclick = async ()=>{
    tableau.extensions.settings.set("svgTemplate", ta.value);
    await tableau.extensions.settings.saveAsync();
    tableau.extensions.ui.closeDialog("saved");
  };
  document.getElementById("cancel").onclick = ()=> tableau.extensions.ui.closeDialog("cancel");
})();