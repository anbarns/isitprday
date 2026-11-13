// Route page UI. Expects window.ROUTE_ID, the route data file and engine.js.
(() => {
const P = window.PR, route = window.PR_ROUTES[window.ROUTE_ID];
const $ = id => document.getElementById(id);
let s = P.loadSettings(route);
let geo = null, wx = null, hours = [], selected = null, calib = route.factor || 0.95;

// ---------- query string prefill: ?w=185&b=18&p=324&pr=15:39&prw=324&ftp=290&u=lb ----------
try{
  const q = new URLSearchParams(location.search);
  const n = k => { const v = parseFloat(q.get(k)); return isNaN(v) ? null : v; };
  if(n("w")) s.riderLb = n("w");
  if(n("b") != null) s.bikeLb = n("b");
  if(n("ftp")) s.ftp = n("ftp");
  if(n("p")) s.power = n("p");
  if(P.parseMSS(q.get("pr")) > 0) s.prTime = q.get("pr");
  if(n("prw")) s.prWatts = n("prw");
  if(q.get("u") === "kg" || q.get("u") === "lb") s.units = q.get("u");
}catch(e){}
s.power = P.defaultPower(s, route);

// ---------- render ----------
function renderNow(){
  const c = wx[Math.floor(wx.length/2)].current;
  const res = P.evaluate(geo, s, calib, P.currentW(wx));
  const wet = (c.precipitation||0) > 0.1;
  const v = P.verdictFor(res.gain, wet, s.thresh);
  const pr = P.parseMSS(s.prTime);
  let prLine = ".";
  if(pr > 0){
    const d = Math.round(pr - res.tWind);
    prLine = ". PR to beat: " + s.prTime + (d === 0 ? ", dead even." : d > 0 ? ", you'd beat it by " + d + "s." : ", you'd miss by " + (-d) + "s.");
  }
  $("verdict").className = "verdict " + v.cls;
  $("verdict").innerHTML = '<div class="v">'+v.v+'</div><div class="why">'+v.why+'</div>' +
    '<div class="small" style="margin-top:8px">At '+s.power+' W right now: about '+P.fmtTime(res.tWind)+' (still air '+P.fmtTime(res.tStill)+')'+prLine+'</div>';
  $("rEst").textContent = "Est. " + P.fmtTime(res.tWind) + " right now · " + P.fmtTime(res.tStill) + " in still air";
  $("wSpeed").textContent = P.fmtMph(c.wind_speed_10m);
  $("wDir").textContent = "from " + P.compass(c.wind_direction_10m) + " (" + Math.round(c.wind_direction_10m) + "°)";
  $("wGust").textContent = P.fmtMph(c.wind_gusts_10m);
  $("wTemp").textContent = P.fmtF(c.temperature_2m) + (wet ? " · raining" : "");
  const a = res.along;
  $("wAlong").textContent = (a>=0?"+":"−") + P.mph(Math.abs(a)).toFixed(1) + " mph";
  $("wAlongNote").textContent = (a>=0 ? "net tailwind" : "net headwind") + " at rider height";
  renderMap(res.perPiece, c.wind_direction_10m, "Now");
}

// ---------- map: Leaflet with dark street map + satellite; SVG fallback if Leaflet can't load ----------
const TAIL = "#3fb27f", HEAD = "#e0614a", INK = "#e9ece8";
let lmap = null, lineLayer = null;
function initMap(){
  if(lmap) return true;
  if(!window.L) return false;
  // Esri dark gray canvas (base + labels). No API key needed, same host as the satellite layer.
  const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
  const dark = L.layerGroup([
    L.tileLayer(esri + "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { attribution:"Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors", maxNativeZoom:16, maxZoom:19 }),
    L.tileLayer(esri + "Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      { maxNativeZoom:16, maxZoom:19 })
  ]);
  const sat = L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution:"Imagery &copy; Esri", maxZoom:19 });
  lmap = L.map("lmap", { zoomControl:false, scrollWheelZoom:false, layers:[dark] });
  L.control.layers({ "Map": dark, "Satellite": sat }, null, { position:"topright" }).addTo(lmap);
  L.control.zoom({ position:"bottomleft" }).addTo(lmap);
  lmap.createPane("ends"); lmap.getPane("ends").style.zIndex = 450;
  lineLayer = L.layerGroup().addTo(lmap);
  const ll = geo.nodes.map(n => [n[0], n[1]]);
  lmap.fitBounds(L.latLngBounds(ll), { padding:[36, 36] });
  L.circleMarker(ll[0], { pane:"ends", radius:7, color:INK, weight:2, fillColor:INK, fillOpacity:1 })
    .bindTooltip("start", { direction:"top" }).addTo(lmap);
  L.circleMarker(ll[ll.length-1], { pane:"ends", radius:7, color:INK, weight:3, fillColor:"#0f1210", fillOpacity:1 })
    .bindTooltip(route.kind === "sprint" ? "finish" : "top", { direction:"top" }).addTo(lmap);
  return true;
}

function renderWindArrow(windFrom){
  const to = P.rad(windFrom + 180), c = 38, L2 = 22, dx = Math.sin(to)*L2, dy = -Math.cos(to)*L2;
  const ax = c+dx, ay = c+dy;
  const l1 = [ax-Math.sin(to-0.5)*9, ay+Math.cos(to-0.5)*9], l2 = [ax-Math.sin(to+0.5)*9, ay+Math.cos(to+0.5)*9];
  $("windArrow").innerHTML =
    '<circle cx="38" cy="38" r="34" fill="none" stroke="#333b34" stroke-width="1.5"/>' +
    '<text x="38" y="14" text-anchor="middle" style="fill:#8b948c;font:10px Inter,sans-serif">N</text>' +
    '<line x1="'+(c-dx)+'" y1="'+(c-dy)+'" x2="'+ax+'" y2="'+ay+'" stroke="'+INK+'" stroke-width="2.5"/>' +
    '<polygon points="'+ax+','+ay+' '+l1.join(',')+' '+l2.join(',')+'" fill="'+INK+'"/>';
}

function renderMap(perPiece, windFrom, label){
  $("mapHour").textContent = label;
  if(!initMap()) return renderSvgMap(perPiece, windFrom);
  renderWindArrow(windFrom);
  lineLayer.clearLayers();
  const n = geo.nodes, maxHw = Math.max(1, ...perPiece.map(Math.abs));
  perPiece.forEach((hw, i) => {
    L.polyline([[n[i][0], n[i][1]], [n[i+1][0], n[i+1][1]]], {
      color: hw < 0 ? TAIL : HEAD, weight: 7, lineCap: "round",
      opacity: 0.45 + 0.55*Math.min(1, Math.abs(hw)/maxHw)
    }).addTo(lineLayer);
  });
}

// Fallback drawing when the map library is unavailable.
function renderSvgMap(perPiece, windFrom){
  $("lmap").style.display = "none"; $("windArrow").style.display = "none"; $("map").style.display = "";
  const n = geo.nodes, W=400, H=320, pad=40, rad = P.rad;
  const lat0 = n.reduce((a,p)=>a+p[0],0)/n.length, kx = Math.cos(rad(lat0));
  const xs = n.map(p=>p[1]*kx), ys = n.map(p=>p[0]);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const sc = Math.min((W-2*pad)/((maxX-minX)||1e-6), (H-2*pad)/((maxY-minY)||1e-6));
  const ox = (W - (maxX-minX)*sc)/2, oy = (H - (maxY-minY)*sc)/2;
  const pt = i => [ox + (xs[i]-minX)*sc, H - (oy + (ys[i]-minY)*sc)];
  const maxHw = Math.max(1, ...perPiece.map(Math.abs));
  let o = "";
  perPiece.forEach((hw,i)=>{
    const [x1,y1]=pt(i), [x2,y2]=pt(i+1);
    o += '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(hw < 0 ? TAIL : HEAD)+'" stroke-opacity="'+(0.35 + 0.65*Math.min(1, Math.abs(hw)/maxHw)).toFixed(2)+'" stroke-width="7" stroke-linecap="round"/>';
  });
  const [sx,sy]=pt(0), [ex,ey]=pt(n.length-1);
  o += '<circle cx="'+sx+'" cy="'+sy+'" r="6" fill="'+INK+'"/><text x="'+sx+'" y="'+(sy-12)+'" text-anchor="middle">start</text>';
  o += '<circle cx="'+ex+'" cy="'+ey+'" r="6" fill="none" stroke="'+INK+'" stroke-width="2"/><text x="'+ex+'" y="'+(ey-12)+'" text-anchor="middle">'+(route.kind === "sprint" ? "finish" : "top")+'</text>';
  $("map").innerHTML = o;
}

function renderChart(){
  const svg = $("chart"), bw = 6, gap = 1, H = 190, mid = 95;
  const W = hours.length*(bw+gap) + 40;
  svg.setAttribute("width", W); svg.setAttribute("viewBox", "0 0 "+W+" "+H);
  const maxAbs = Math.max(s.thresh*2, ...hours.map(h=>Math.abs(h.gain)));
  const k = (mid-22)/maxAbs;
  let o = '<line x1="0" x2="'+W+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--line)"/>';
  o += '<line x1="0" x2="'+W+'" y1="'+(mid-s.thresh*k)+'" y2="'+(mid-s.thresh*k)+'" stroke="var(--tail)" stroke-dasharray="3 4" stroke-opacity=".5"/>';
  hours.forEach((h,i)=>{
    const x = 20 + i*(bw+gap), p = P.parseLocal(h.time);
    if(!h.day) o += '<rect x="'+x+'" y="0" width="'+(bw+gap)+'" height="'+(H-18)+'" fill="#0b0d0c"/>';
    if(p.hh===0) o += '<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(H-18)+'" stroke="var(--line)"/><text x="'+(x+3)+'" y="'+(H-4)+'">'+P.DOW[p.dow]+' '+p.mo+'/'+p.da+'</text>';
  });
  hours.forEach((h,i)=>{
    const x = 20 + i*(bw+gap), y = h.gain>=0 ? mid - h.gain*k : mid, hh = Math.max(1, Math.abs(h.gain)*k);
    const wet = P.isWet(h);
    const col = wet ? "#4b5a6e" : (h.gain>=0 ? "var(--tail)" : "var(--head)");
    const sel = i===selected ? ' stroke="var(--ink)" stroke-width="1.5"' : '';
    o += '<rect data-i="'+i+'" x="'+x+'" y="'+y+'" width="'+bw+'" height="'+hh+'" fill="'+col+'" fill-opacity="'+(h.day?1:.45)+'"'+sel+' style="cursor:pointer"><title>'+P.fmtHour(h.time)+': '+P.fmtSec(h.gain)+', '+P.fmtMph(h.ws)+' from '+P.compass(h.wd)+(wet?' (wet)':'')+'</title></rect>';
    o += '<rect data-i="'+i+'" x="'+x+'" y="0" width="'+(bw+gap)+'" height="'+(H-18)+'" fill="transparent" style="cursor:pointer"/>';
  });
  svg.innerHTML = o;
  svg.onclick = e => { const i = e.target.getAttribute("data-i"); if(i!=null) selectHour(+i); };
  if(selected == null) svg.parentElement.scrollLeft = Math.max(0, 20 + P.currentHourIndex(wx, hours)*(bw+gap) - 40);
}

function selectHour(i){
  selected = i; const h = hours[i];
  renderMap(h.perPiece, h.wd, P.fmtHour(h.time) + " · " + P.fmtSec(h.gain) + " · " + P.fmtMph(h.ws) + " " + P.compass(h.wd));
  renderChart();
}

const li = h => '<li><a href="#" data-i="'+h.i+'">'+P.fmtHour(h.time)+'</a> <span class="pill '+(h.gain>=0?'pt':'ph')+'">'+P.fmtSec(h.gain)+'</span> <span class="small">'+P.fmtMph(h.ws)+' '+P.compass(h.wd)+(P.isWet(h)?' · wet':'')+'</span></li>';
let topPick = null;
function renderLists(){
  const now = P.currentHourIndex(wx, hours);
  const best = P.bestWindows(hours, now, 5);
  topPick = best[0];
  $("best").innerHTML = best.map(li).join("") || '<li class="small">No dry daylight hours found.</li>';
  const g = route.groupRide;
  if(g){
    $("groupLabel").textContent = P.DOW[g.dow] + " mornings (" + g.name + ")";
    const list = hours.map((h,i)=>Object.assign({i},h)).filter(h=>{ const p=P.parseLocal(h.time); return h.i>=now-1 && p.dow===g.dow && p.hh===g.hour; });
    $("weds").innerHTML = list.map(li).join("") || '<li class="small">None in range.</li>';
  } else $("groupWrap").style.display = "none";
  document.querySelectorAll("#best a, #weds a").forEach(a=>a.onclick=e=>{e.preventDefault(); selectHour(+a.dataset.i);});
}

function renderAll(){
  calib = P.calibrate(geo, s, route);
  hours = P.computeHours(geo, s, calib, wx);
  renderNow(); renderChart(); renderLists();
  $("dataStamp").textContent = "Weather: Open-Meteo, updated " + wx[0].current.time.replace("T"," ") + " local. Model factor " + calib.toFixed(3) + (P.parseMSS(s.prTime) > 0 && s.prWatts ? " (tuned to your PR)." : " (route default).");
}

async function run(){
  try{
    geo = await P.prepare(route);
    $("title").textContent = "Is it PR day on " + route.name + "?";
    $("routeLine").innerHTML = (geo.total/1609.34).toFixed(2) + " mi · ~" + Math.round(geo.gain*3.281) + " ft gain · " + route.area + (route.state ? ", " + route.state : "") +
      (route.strava ? ' · <a href="'+route.strava+'" target="_blank" rel="noopener">Strava segment</a>' : "");
    wx = await P.fetchWeather(geo, 7, route.tz);
    renderAll();
  }catch(err){
    $("verdict").className="verdict no";
    $("verdict").innerHTML='<div class="v">No data.</div><div class="why">'+err.message+'</div>';
    console.error(err);
  }
}

// ---------- inputs ----------
const KG = P.KG;
const toUnit = lb => s.units === "kg" ? +(lb*KG).toFixed(1) : +(+lb).toFixed(1);
const fromUnit = v => s.units === "kg" ? v/KG : v;
function fill(){
  $("rRider").value = toUnit(s.riderLb);
  $("rBike").value = toUnit(s.bikeLb);
  $("rPower").value = s.power;
  $("rFtp").value = s.ftp || "";
  $("rPrTime").value = s.prTime || "";
  $("rPrWatts").value = s.prWatts || "";
  document.querySelectorAll(".u").forEach(e => e.textContent = s.units);
  document.querySelectorAll(".unit").forEach(b => b.classList.toggle("on", b.dataset.u === s.units));
  ["cda","crr","shelter","thresh"].forEach(k => $("s"+k[0].toUpperCase()+k.slice(1)).value = s[k]);
  showWkg();
}
function showWkg(){
  const kg = s.riderLb*KG;
  $("rWkg").textContent = kg > 0 && s.power > 0 ? (s.power/kg).toFixed(2) + " W/kg" : "";
}
let tmr = null;
function recalc(){ P.saveSettings(s, route); if(geo && wx) renderAll(); }
function readRider(){
  const num = id => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  const r = num("rRider"), b = num("rBike"), p = num("rPower"), pw = num("rPrWatts"), f = num("rFtp");
  if(r && r > 0) s.riderLb = fromUnit(r);
  if(b != null && b >= 0) s.bikeLb = fromUnit(b);
  if(p && p > 0) s.power = p;
  s.ftp = f && f > 0 ? f : null;
  const pt = $("rPrTime").value.trim();
  s.prTime = P.parseMSS(pt) > 0 ? pt : "";
  s.prWatts = pw && pw > 0 ? pw : null;
  showWkg();
  clearTimeout(tmr); tmr = setTimeout(recalc, 250);
}
["rRider","rBike","rPower","rFtp","rPrTime","rPrWatts"].forEach(id => $(id).addEventListener("input", readRider));
document.querySelectorAll(".unit").forEach(b => b.onclick = () => { s.units = b.dataset.u; fill(); P.saveSettings(s, route); });
$("useFtp").title = "Efforts this long are usually ridden at about " + Math.round((route.ftpPct||1)*100) + "% of FTP";
$("useFtp").onclick = () => {
  const f = parseFloat($("rFtp").value); if(!(f > 0)) return;
  s.ftp = f; s.power = Math.round(f*(route.ftpPct||1)/5)*5; $("rPower").value = s.power; showWkg(); recalc();
};
$("saveSettings").onclick = () => {
  ["cda","crr","shelter","thresh"].forEach(k => { const v = parseFloat($("s"+k[0].toUpperCase()+k.slice(1)).value); if(!isNaN(v)) s[k] = v; });
  s.shelter = Math.max(0, Math.min(1, s.shelter));
  recalc();
};
$("shareLink").onclick = async () => {
  const q = new URLSearchParams({ w: Math.round(s.riderLb), b: Math.round(s.bikeLb), p: s.power, u: s.units });
  if(s.ftp) q.set("ftp", s.ftp);
  if(s.prTime) q.set("pr", s.prTime);
  if(s.prWatts) q.set("prw", s.prWatts);
  const url = location.origin + location.pathname + "?" + q.toString();
  try{ await navigator.clipboard.writeText(url); $("shareMsg").textContent = "Copied."; }
  catch(e){ $("shareMsg").textContent = url; }
};
$("copyBtn").onclick = async () => {
  const b = topPick, link = location.origin + location.pathname;
  const text = b && b.gain >= s.thresh
    ? "Tailwind on " + route.name + " " + P.fmtHour(b.time) + ". Worth ~" + Math.round(b.gain) + "s. Who's in? " + link
    : "No tailwind on " + route.name + " this week. Best I see is " + (b ? P.fmtHour(b.time) + " (" + P.fmtSec(b.gain) + ")" : "nothing") + ". " + link;
  try{ await navigator.clipboard.writeText(text); $("copyMsg").textContent = "Copied."; }
  catch(e){ $("copyMsg").textContent = text; }
};

fill();
run();
setInterval(async () => { try{ wx = await P.fetchWeather(geo, 7, route.tz); renderAll(); }catch(e){} }, 15*60*1000);
})();
