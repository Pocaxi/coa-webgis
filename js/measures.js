window.WG = window.WG || {};
// Geodesic helpers equivalent to turf.length / turf.area, without the 600 kB library.
WG.geo = {
  rad: degrees => degrees * Math.PI / 180,
  lengthMeters(points) {
    const radius = 6371008.8;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const [lon1, lat1] = points[i - 1], [lon2, lat2] = points[i];
      const dLat = WG.geo.rad(lat2 - lat1), dLon = WG.geo.rad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(WG.geo.rad(lat1)) * Math.cos(WG.geo.rad(lat2)) * Math.sin(dLon / 2) ** 2;
      total += 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return total;
  },
  areaSquareMeters(points) {
    const radius = 6378137;
    if (points.length < 3) return 0;
    let total = 0;
    for (let i = 0; i < points.length; i++) {
      const [lon1, lat1] = points[i], [lon2, lat2] = points[(i + 1) % points.length];
      total += WG.geo.rad(lon2 - lon1) * (2 + Math.sin(WG.geo.rad(lat1)) + Math.sin(WG.geo.rad(lat2)));
    }
    return Math.abs(total * radius * radius / 2);
  },
};
WG.formatDistance = meters => meters < 1000
  ? `${meters.toLocaleString('pt-BR', {maximumFractionDigits: 1})} m`
  : `${(meters / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 3})} km`;
WG.formatArea = squareMeters => `${(squareMeters / 10000).toLocaleString('pt-BR', {maximumFractionDigits: 3})} ha (${Math.round(squareMeters).toLocaleString('pt-BR')} m²)`;
WG.enableMeasures = function(map) {
  let mode=null,points=[];
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#a7d46f';
  const setMode=next=>{mode=next;WG.measuring=Boolean(next);points=[];document.querySelectorAll('.tool-grid button').forEach(b=>b.classList.remove('active'));if(next)document.getElementById(next==='distance'?'distanceButton':'areaButton').classList.add('active');map.getCanvas().style.cursor=next?'crosshair':'';update();};
  const update=()=>{
    const collection={type:'FeatureCollection',features:[]};
    if(points.length){const coords=mode==='area'&&points.length>2?[...points,points[0]]:points;collection.features.push({type:'Feature',geometry:{type:'LineString',coordinates:coords},properties:{}});if(mode==='area'&&points.length>2)collection.features.push({type:'Feature',geometry:{type:'Polygon',coordinates:[[...points,points[0]]]},properties:{}});collection.features.push(...points.map(point=>({type:'Feature',geometry:{type:'Point',coordinates:point},properties:{}})));}
    map.getSource('wg-measure')?.setData(collection);
    let text=mode?'Toque no mapa para adicionar pontos.':'';
    if(mode==='distance'&&points.length>1)text=WG.formatDistance(WG.geo.lengthMeters(points));
    if(mode==='area'&&points.length>2)text=WG.formatArea(WG.geo.areaSquareMeters(points));
    document.getElementById('measureResult').textContent=text;
  };
  map.addSource('wg-measure',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'wg-measure-fill',type:'fill',source:'wg-measure',filter:['==',['geometry-type'],'Polygon'],paint:{'fill-color':accent,'fill-opacity':.25}});
  map.addLayer({id:'wg-measure-line',type:'line',source:'wg-measure',filter:['==',['geometry-type'],'LineString'],paint:{'line-color':accent,'line-width':3}});
  map.addLayer({id:'wg-measure-points',type:'circle',source:'wg-measure',filter:['==',['geometry-type'],'Point'],paint:{'circle-radius':4,'circle-color':'#fff','circle-stroke-color':accent,'circle-stroke-width':2}});
  map.on('click',e=>{if(mode){points.push([e.lngLat.lng,e.lngLat.lat]);update();}});
  document.getElementById('distanceButton').onclick=()=>setMode(mode==='distance'?null:'distance');
  document.getElementById('areaButton').onclick=()=>setMode(mode==='area'?null:'area');
  document.getElementById('clearMeasureButton').onclick=()=>setMode(null);
  document.getElementById('locationButton').onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:18}),e=>alert(`Localização indisponível: ${e.message}`),{enableHighAccuracy:true,timeout:15000}):alert('Geolocalização não suportada.');
};
