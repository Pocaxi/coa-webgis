window.WG = window.WG || {};
WG.config = window.WG_CONFIG || window.COA_CONFIG || {};
WG.createMap = function(project) {
  if (window.pmtiles && !WG.pmtilesProtocol) {
    WG.pmtilesProtocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', WG.pmtilesProtocol.tile);
  }
  const style = {version: 8, sources: {}, layers: [{id:'background',type:'background',paint:{'background-color':'#dfe6e8'}}]};
  if (project.basemap === 'osm') {
    style.sources.osm = {type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'© OpenStreetMap contributors'};
    style.layers.push({id:'osm',type:'raster',source:'osm'});
  }
  const center = project.bounds ? [(project.bounds[0]+project.bounds[2])/2,(project.bounds[1]+project.bounds[3])/2] : [-47.9,-15.7];
  // maxZoom above the orthomosaic tiles lets the producer magnify plants and failures.
  const map = new maplibregl.Map({container:'map',style,center,zoom:project.bounds?13:4,maxZoom:24,attributionControl:{compact:true}});
  map.on('error', event => console.error('[WebGIS MapLibre]', event.error || event));
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
  map.addControl(new maplibregl.FullscreenControl(),'top-right');
  map.addControl(new maplibregl.ScaleControl({maxWidth:130,unit:'metric'}),'bottom-right');
  const coordinates = document.getElementById('coordinates');
  if (coordinates) map.on('mousemove',e=>coordinates.textContent=`${e.lngLat.lat.toFixed(6)}, ${e.lngLat.lng.toFixed(6)}`);
  return map;
};
WG.fitProject = function(map, project) {
  if (project.bounds) map.fitBounds([[project.bounds[0],project.bounds[1]],[project.bounds[2],project.bounds[3]]],{padding:40,maxZoom:19});
};
