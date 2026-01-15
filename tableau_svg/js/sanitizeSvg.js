function sanitizeSvg(svg){
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  doc.querySelectorAll("script,foreignObject").forEach(e=>e.remove());
  doc.querySelectorAll("*").forEach(el=>{
    [...el.attributes].forEach(a=>{
      if(a.name.startsWith("on")) el.removeAttribute(a.name);
    });
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}
