function buildTemplateModel(table){
  const cols = table.columns.map(c => c.fieldName);
  const rows = table.data.map(r => {
    const o = {};
    r.forEach((c,i)=> o[cols[i]] = c.formattedValue ?? c.value);
    return o;
  });
  return { rows, ...rows[0] };
}

function applySvgTemplate(svg, model){
  return Mustache.render(svg, model);
}
