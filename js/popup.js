window.WG = window.WG || {};
// Friendly names for attributes added by the plugin (current and older prefixes).
WG.INTERNAL_LABELS = {
  length_m: 'Comprimento (m)', class: 'Classe da falha', area_ha: 'Área (ha)',
  category: 'Categoria', source_layer: 'Camada de origem',
};
WG.internalName = key => {
  const match = /^_(?:wg|coa)_(.+)$/.exec(String(key));
  return match ? match[1] : null;
};
WG.fieldLabel = key => {
  const internal = WG.internalName(key);
  return internal ? (WG.INTERNAL_LABELS[internal] || internal) : key;
};
WG.formatValue = value => {
  if (typeof value === 'number' && Number.isFinite(value)) return value.toLocaleString('pt-BR', {maximumFractionDigits: 2});
  if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) return Number(value).toLocaleString('pt-BR', {maximumFractionDigits: 2});
  return value;
};
WG.enablePopups = function(map, layerIds) {
  if(!layerIds.length)return;
  map.on('click',e=>{
    if (WG.measuring) return;
    const features=map.queryRenderedFeatures(e.point,{layers:layerIds});if(!features.length)return;
    const f=features[0], props=f.properties||{};const config=(WG.popupConfigs||{})[f.layer.id]||{};
    const explicit=config.popup_fields_explicit||(config.popup_fields||[]).length>0;
    // Without an explicit list: user attributes plus the useful internal ones.
    const allowed=explicit
      ?(config.popup_fields||[]).filter(key=>Object.prototype.hasOwnProperty.call(props,key)).map(key=>[key,props[key]])
      :Object.entries(props).filter(([key])=>{const internal=WG.internalName(key);return !internal||internal in WG.INTERNAL_LABELS;}).slice(0,12);
    const title=config.name?`<div class="popup-title">${WG.escape(WG.layerLabel?WG.layerLabel(config):config.name)}</div>`:'';
    const rows=allowed.map(([k,v])=>`<tr><td>${WG.escape(WG.fieldLabel(k))}</td><td>${WG.escape(WG.formatValue(v))}</td></tr>`).join('');
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`${title}<table class="popup-table">${rows}</table>`).addTo(map);
  });
  map.on('mousemove',e=>{map.getCanvas().style.cursor=!WG.measuring&&map.queryRenderedFeatures(e.point,{layers:layerIds}).length?'pointer':'';});
};
WG.escape = value => String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
