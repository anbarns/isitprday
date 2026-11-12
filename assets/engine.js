// Is it PR day? Shared engine: geometry, weather, physics, settings.
(function(){
const TZ = "America/Los_Angeles";
const KG = 0.45359;
const R = 6371000, rad = d => d*Math.PI/180, deg = r => r*180/Math.PI;

// ---------- storage (best effort) ----------
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

// ---------- settings ----------
// Rider and model settings are shared across routes. Power and PR are per route.
const RIDER_DEFAULTS = { riderLb:165, bikeLb:18, ftp:null, units:"lb" };
const MODEL_DEFAULTS = { cda:0.36, crr:0.005, shelter:0.5, thresh:5 };
function loadSettings(route){
  const rider = Object.assign({}, RIDER_DEFAULTS, store.get("ipd.rider", {}));
  const model = Object.assign({}, MODEL_DEFAULTS, store.get("ipd.model", {}));
  const per = Object.assign({ power:null, prTime:"", prWatts:null }, store.get("ipd.route." + route.id, {}));
  return Object.assign({}, rider, model, per);
}
function defaultPower(s, route){
  if(s.power > 0) return s.power;
  if(s.ftp > 0) return Math.round(s.ftp * (route.ftpPct || 1) / 5) * 5;
  return 250;
}
function saveSettings(s, route){
  store.set("ipd.rider", { riderLb:s.riderLb, bikeLb:s.bikeLb, ftp:s.ftp, units:s.units });
  store.set("ipd.model", { cda:s.cda, crr:s.crr, shelter:s.shelter, thresh:s.thresh });
  store.set("ipd.route." + route.id, { power:s.power, prTime:s.prTime, prWatts:s.prWatts });
}

// ---------- geo ----------
function hav(a, b){
  const dLat = rad(b[0]-a[0]), dLon = rad(b[1]-a[1]);
  const s = Math.sin(dLat/2)**2 + Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
function bearing(a, b){
  const y = Math.sin(rad(b[1]-a[1]))*Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0]))*Math.sin(rad(b[0])) - Math.sin(rad(a[0]))*Math.cos(rad(b[0]))*Math.cos(rad(b[1]-a[1]));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
const compass = d => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d/22.5)%16];

function resample(pts){
  const cum=[0];
  for(let i=1;i<pts.length;i++) cum.push(cum[i-1]+hav(pts[i-1],pts[i]));
  const total = cum[cum.length-1];
  const n = Math.max(8, Math.min(90, Math.round(total/100)));
  const step = total/n, nodes=[];
  let j=0;
  for(let k=0;k<=n;k++){
    const d = Math.min(k*step, total);
    while(j < pts.length-2 && cum[j+1] < d) j++;
    const seg = cum[j+1]-cum[j] || 1, t = (d-cum[j])/seg;
    const a=pts[j], b=pts[j+1];
    const node=[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
    if(a[2]!=null && b[2]!=null) node[2] = a[2]+(b[2]-a[2])*t;
    nodes.push(node);
  }
  return { nodes, total };
}

const geoCache = {};
async function prepare(route){
  if(geoCache[route.id]) return geoCache[route.id];
  const { nodes, total } = resample(route.pts);
  let elev = nodes.map(n => n[2]);
  if(elev.some(e => e == null)){
    const url = "https://api.open-meteo.com/v1/elevation?latitude=" + nodes.map(n=>n[0].toFixed(5)).join(",") +
                "&longitude=" + nodes.map(n=>n[1].toFixed(5)).join(",");
    elev = (await (await fetch(url)).json()).elevation;
  }
  const sm = elev.map((e,i)=>{ const a=elev[Math.max(0,i-1)], c=elev[Math.min(elev.length-1,i+1)]; return (a+2*e+c)/4; });
  const nS = Math.min(8, nodes.length);
  const sampleIdx = Array.from({length:nS}, (_,k)=>Math.round(k*(nodes.length-1)/(nS-1)));
  const pieces = [];
  for(let i=0;i<nodes.length-1;i++){
    const len = hav(nodes[i], nodes[i+1]);
    const grade = Math.max(-0.25, Math.min(0.25, (sm[i+1]-sm[i])/(len||1)));
    let best=0, bd=1e9;
    sampleIdx.forEach((si,k)=>{ const d=Math.abs(si-i); if(d<bd){bd=d;best=k;} });
    pieces.push({ len, brg: bearing(nodes[i], nodes[i+1]), grade, sample: best });
  }
  const gain = sm.reduce((s,e,i)=> i && e>sm[i-1] ? s+(e-sm[i-1]) : s, 0);
  return (geoCache[route.id] = { nodes, total, pieces, sampleIdx, elev: sm, gain });
}

// ---------- weather ----------
async function fetchWeather(geo, days){
  const s = geo.sampleIdx.map(i=>geo.nodes[i]);
  const vars = "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,precipitation";
  const url = "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + s.map(p=>p[0].toFixed(4)).join(",") +
    "&longitude=" + s.map(p=>p[1].toFixed(4)).join(",") +
    "&current=" + vars +
    "&hourly=" + vars + ",precipitation_probability,is_day" +
    "&wind_speed_unit=ms&timezone=" + encodeURIComponent(TZ) + "&forecast_days=" + (days || 7);
  const r = await fetch(url);
  if(!r.ok) throw new Error("Weather request failed (" + r.status + ")");
  const j = await r.json();
  return Array.isArray(j) ? j : [j];
}
const currentW = wx => k => { const c = wx[k].current; return { ws:c.wind_speed_10m, wd:c.wind_direction_10m, t:c.temperature_2m, p:c.surface_pressure }; };
const hourW = (wx, i) => k => { const h = wx[k].hourly; return { ws:h.wind_speed_10m[i], wd:h.wind_direction_10m[i], t:h.temperature_2m[i], p:h.surface_pressure[i] }; };

// ---------- physics ----------
function solveSpeed(P, m, grade, hw, rho, cda, crr){
  const th = Math.atan(grade), g = 9.81;
  const Fg = m*g*(Math.sin(th) + crr*Math.cos(th));
  const pw = v => { const va = v + hw; return v*(Fg + 0.5*rho*cda*va*Math.abs(va)); };
  let lo=0.2, hi=30;
  for(let i=0;i<60;i++){ const mid=(lo+hi)/2; if(pw(mid) > P) hi=mid; else lo=mid; }
  return (lo+hi)/2;
}
const massKg = s => (s.riderLb + s.bikeLb)*KG;
const parseMSS = s => { const m = String(s||"").trim().match(/^(\d+):(\d{1,2})$/); return m ? (+m[1])*60 + (+m[2]) : NaN; };

// Scale effective power so the still-air model reproduces the rider's PR at PR watts.
// Without a PR, use the route's tuned factor.
function calibrate(geo, s, route){
  const target = parseMSS(s.prTime), W = s.prWatts;
  if(!(target > 0) || !(W > 0)) return route.factor || 0.95;
  const m = massKg(s), rho = 98500/(287.05*288.15);
  const still = P => geo.pieces.reduce((t,pc)=> t + pc.len/solveSpeed(P, m, pc.grade, 0, rho, s.cda, s.crr), 0);
  let lo = 0.6, hi = 1.4;
  for(let i=0;i<50;i++){ const mid=(lo+hi)/2; if(still(W*mid) > target) lo = mid; else hi = mid; }
  return (lo+hi)/2;
}

function evaluate(geo, s, calib, getW){
  const P = s.power*calib, m = massKg(s);
  let tWind=0, tStill=0, along=0;
  const perPiece = geo.pieces.map(pc=>{
    const w = getW(pc.sample);
    const rho = (w.p*100)/(287.05*(w.t+273.15));
    const hw = s.shelter * w.ws * Math.cos(rad(w.wd - pc.brg)); // + = headwind
    const v1 = solveSpeed(P, m, pc.grade, hw, rho, s.cda, s.crr);
    const v0 = solveSpeed(P, m, pc.grade, 0, rho, s.cda, s.crr);
    tWind += pc.len/v1; tStill += pc.len/v0; along += -hw*pc.len;
    return hw;
  });
  return { gain: tStill - tWind, tWind, tStill, along: along/geo.total, perPiece };
}

function computeHours(geo, s, calib, wx){
  const h0 = wx[0].hourly, mid = wx[Math.floor(wx.length/2)].hourly;
  return h0.time.map((time, i)=> Object.assign(evaluate(geo, s, calib, hourW(wx, i)), {
    time, day: h0.is_day[i] === 1,
    ws: mid.wind_speed_10m[i], wd: mid.wind_direction_10m[i], gust: mid.wind_gusts_10m[i],
    t: mid.temperature_2m[i], pop: mid.precipitation_probability ? mid.precipitation_probability[i] : null,
    precip: mid.precipitation[i]
  }));
}
const isWet = h => (h.pop != null && h.pop >= 40) || h.precip > 0.1;
function currentHourIndex(wx, hours){
  const t = wx[0].current.time.slice(0,13);
  const i = hours.findIndex(h=>h.time.slice(0,13)===t);
  return i<0 ? 0 : i;
}
function bestWindows(hours, from, count){
  const pool = hours.map((h,i)=>Object.assign({i},h)).filter(h=>h.i>=from && h.day && !isWet(h)).sort((a,b)=>b.gain-a.gain);
  const out = [];
  for(const h of pool){ if(!out.some(o=>Math.abs(o.i-h.i)<=2)) out.push(h); if(out.length>=count) break; }
  return out;
}

// ---------- formatting ----------
const mph = ms => ms*2.23694;
const fmtMph = ms => mph(ms).toFixed(1) + " mph";
const fmtF = c => Math.round(c*9/5+32) + "°F";
const fmtSec = s => (s>=0?"+":"−") + Math.abs(s).toFixed(1) + "s";
const fmtTime = s => { const x=Math.round(s), m=Math.floor(x/60), r=x%60; return m+":"+String(r).padStart(2,"0"); };
const parseLocal = iso => { const [d,t]=iso.split("T"); const [y,mo,da]=d.split("-").map(Number); const [hh,mm]=t.split(":").map(Number); return {y,mo,da,hh,mm,dow:new Date(Date.UTC(y,mo-1,da)).getUTCDay()}; };
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const fmtHour = iso => { const p=parseLocal(iso); const h=p.hh%12||12; return DOW[p.dow]+" "+p.mo+"/"+p.da+" "+h+(p.hh<12?"am":"pm"); };

function verdictFor(gain, wet, th){
  if(wet) return { cls:"no", v:"Wet roads.", short:"Wet", why:"Rain in the forecast. Not a PR day, whatever the wind says." };
  if(gain >= th) return { cls:"yes", v:"Yes. Send it.", short:"Yes", why:"Tailwind is worth about " + gain.toFixed(0) + " seconds. Text the group chat." };
  if(gain > -th) return { cls:"meh", v:"Meh.", short:"Meh", why:"Wind is roughly a wash (" + fmtSec(gain) + "). Ride for the coffee." };
  return { cls:"no", v:"No.", short:"No", why:"Headwind costs you about " + Math.abs(gain).toFixed(0) + " seconds. Save the legs." };
}

window.PR = { KG, store, loadSettings, saveSettings, defaultPower, prepare, fetchWeather, currentW, hourW,
  calibrate, evaluate, computeHours, isWet, currentHourIndex, bestWindows, parseMSS, compass, rad,
  mph, fmtMph, fmtF, fmtSec, fmtTime, parseLocal, DOW, fmtHour, verdictFor };
})();
