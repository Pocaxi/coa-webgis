window.WG = window.WG || {};
// Pages published by older versions share these scripts but not the newer
// markup; the missing pieces are created here so they get the same features.
WG.ensureUi = function() {
  const sidebar = document.getElementById('sidebar');
  const tools = document.querySelector('.tool-grid');
  const brand = document.querySelector('.topbar .brand');
  if (brand && !document.getElementById('brandName')) {
    brand.querySelectorAll('strong').forEach(node => node.remove());
    const logo = document.createElement('img'); logo.id = 'brandLogo'; logo.className = 'brand-logo'; logo.alt = ''; logo.hidden = true;
    const name = document.createElement('span'); name.id = 'brandName'; name.className = 'brand-name';
    brand.prepend(logo, name);
  }
  if (sidebar && !document.getElementById('legendSection')) {
    const section = document.createElement('section'); section.id = 'legendSection'; section.hidden = true;
    section.innerHTML = '<h2>Classes de falha</h2><div id="legend" class="legend"></div>';
    const layers = document.getElementById('layerList');
    sidebar.insertBefore(section, layers ? layers.closest('section') : null);
  }
  if (tools) {
    for (const [id, label] of [['shareButton', 'Compartilhar'], ['snapshotButton', 'Salvar imagem']]) {
      if (!document.getElementById(id)) {
        const button = document.createElement('button'); button.id = id; button.textContent = label; tools.append(button);
      }
    }
  }
  if (sidebar && !document.getElementById('credit')) {
    const credit = document.createElement('footer'); credit.id = 'credit'; credit.className = 'credit'; sidebar.append(credit);
  }
};

WG.applyBranding = function(project) {
  const branding = project.branding || {};
  const root = document.documentElement.style;
  if (branding.primary) root.setProperty('--primary', branding.primary);
  if (branding.accent) root.setProperty('--accent', branding.accent);
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme && branding.primary) theme.setAttribute('content', branding.primary);
  const logo = document.getElementById('brandLogo'), name = document.getElementById('brandName');
  if (logo && branding.logo) {
    logo.src = WG.projectUrl(branding.logo); logo.alt = branding.name || ''; logo.hidden = false;
    logo.onerror = () => { logo.hidden = true; if (name) name.textContent = branding.name || project.company || ''; };
  } else if (name) {
    name.textContent = branding.name || project.company || '';
  }
  const credit = document.getElementById('credit');
  if (credit) credit.textContent = branding.credit || '';
  const place = [project.farm, project.field_code || project.field].filter(Boolean).join(' • ');
  document.title = [branding.name || project.company, place || 'Mapa interativo'].filter(Boolean).join(' | ');
};

WG.loadScript = src => new Promise((resolve, reject) => {
  const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.append(script);
});

WG.shareLink = async function(project) {
  const url = location.href.replace(/[?&]qr=1/, '').replace(/\?$/, '');
  const title = document.title;
  if (navigator.share) {
    try { await navigator.share({title, url}); return; } catch (error) { if (error && error.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); } catch (_error) { /* QR code still shown */ }
  WG.showQr(url, 'Link copiado. Para abrir no celular, aponte a câmera para o código:');
};

WG.showQr = async function(url, message) {
  const overlay = document.createElement('div'); overlay.className = 'qr-overlay';
  const card = document.createElement('div'); card.className = 'qr-card';
  card.innerHTML = `<h2>Compartilhar mapa</h2><p>${WG.escape(message || '')}</p><canvas id="wgQr"></canvas><p class="qr-url">${WG.escape(url)}</p><button type="button">Fechar</button>`;
  overlay.append(card); document.body.append(overlay);
  const close = () => overlay.remove();
  overlay.onclick = event => { if (event.target === overlay) close(); };
  card.querySelector('button').onclick = close;
  try {
    if (!window.QRCode) await WG.loadScript('https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js');
    QRCode.toCanvas(document.getElementById('wgQr'), url, {width: 240, margin: 2});
  } catch (_error) {
    document.getElementById('wgQr').remove();
  }
};

WG.saveSnapshot = function(map, project) {
  // Read the canvas inside a render callback, while its buffer is still valid.
  map.once('render', () => {
    map.getCanvas().toBlob(blob => {
      if (!blob) return;
      const link = document.createElement('a');
      const name = [project.farm, project.field_code || project.field, project.survey_date].filter(Boolean).join('_') || 'mapa';
      link.download = `${name.replace(/[^\w\-]+/g, '_')}.png`;
      link.href = URL.createObjectURL(blob); link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    }, 'image/png');
  });
  map.triggerRepaint();
};

(async function(){
  WG.ensureUi();
  const projectBase=new URL((WG.config||window.WG_CONFIG||window.COA_CONFIG||{}).projectBase||'./',window.location.href);const manifestUrl=window.WG_PROJECT_MANIFEST||window.COA_PROJECT_MANIFEST||new URL('project.json',projectBase).href;const response=await fetch(manifestUrl,{cache:'no-store'});if(!response.ok)throw new Error(`project.json não encontrado (HTTP ${response.status})`);const project=await response.json();
  WG.applyBranding(project);
  document.getElementById('mapTitle').textContent=[project.farm,project.field_code||project.field].filter(Boolean).join(' • ')||project.company||'Mapa';
  const number=(value,digits=2)=>Number(value).toLocaleString('pt-BR',{maximumFractionDigits:digits});
  const date=value=>{const parts=String(value||'').slice(0,10).split('-');return parts.length===3?parts.reverse().join('/'):value;};
  const fields=[['Empresa',project.company],['Fazenda',project.farm],['Talhão',project.field_code||project.field],['Cultura',project.crop],['Safra',project.season],['Levantamento',project.survey_type],['Data',date(project.survey_date)],['Responsável',project.technician]];document.getElementById('identity').innerHTML=fields.filter(x=>x[1]).map(x=>`<div><strong>${WG.escape(x[0])}:</strong> ${WG.escape(x[1])}</div>`).join('');
  const s=project.statistics||{},metrics=[['Área',s.area_ha!=null?`${number(s.area_ha)} ha`:null],['Falhas',s.failure_count!=null?number(s.failure_count,0):null],['Comprimento',s.failure_length_m!=null?`${number(s.failure_length_m)} m`:null],['Falhas/ha',s.failure_m_per_ha!=null?`${number(s.failure_m_per_ha)} m/ha`:null],['Falha média',s.failure_mean_m?`${number(s.failure_mean_m)} m`:null],['Maior falha',s.failure_max_m?`${number(s.failure_max_m)} m`:null],['Linhas',s.total_row_length_m!=null?`${number(s.total_row_length_m)} m`:null],['Falha linear',s.failure_percentage!=null?`${number(s.failure_percentage)}%`:null]];document.getElementById('indicators').innerHTML=metrics.filter(x=>x[1]!=null).map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')||'<span>Sem indicadores.</span>';
  WG.renderLegend(project);
  const sidebar=document.getElementById('sidebar');
  if(window.matchMedia&&window.matchMedia('(max-width: 768px)').matches)sidebar.classList.add('closed');
  const map=WG.createMap(project);map.on('load',async()=>{try{const queryable=await WG.addProjectLayers(map,project);WG.enablePopups(map,queryable);WG.enableMeasures(map);WG.fitProject(map,project);}catch(error){console.error(error);document.getElementById('mapTitle').textContent=`Falha ao carregar camadas: ${error.message}`;}});
  document.getElementById('menuButton').onclick=()=>{sidebar.classList.toggle('closed');setTimeout(()=>map.resize&&map.resize(),250);};document.getElementById('fitButton').onclick=()=>WG.fitProject(map,project);
  const share=document.getElementById('shareButton'),snapshot=document.getElementById('snapshotButton');
  if(share)share.onclick=()=>WG.shareLink(project);
  if(snapshot)snapshot.onclick=()=>WG.saveSnapshot(map,project);
  if(new URLSearchParams(location.search).get('qr')==='1')WG.showQr(location.href.replace(/[?&]qr=1/,'').replace(/\?$/,''),'Aponte a câmera do celular para abrir este mapa:');
})().catch(error=>{console.error('[WebGIS] Não foi possível carregar os dados deste projeto.',error);document.body.innerHTML=`<main class="startup-error" style="padding:2rem"><h1>Não foi possível carregar os dados deste projeto.</h1><p>${String(error.message)}</p><p>Use o botão PRÉ-VISUALIZAR do plugin para iniciar o servidor local.</p></main>`;});
