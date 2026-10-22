/* Cacería Heurística — lógica del juego.
   Depende de assets/data.js (window.CH). Sin dependencias externas. */
(function(){
"use strict";
const {CATS,CARDS,BUGS,LABEL,HINTS,LEVELS,WISDOM,SPEC,MNEMO}=window.CH;

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const p2=n=>String(n).padStart(2,"0");
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;

/* ---------- pixel art ---------- */
const BUG=[".#....#.","..#..#..",".######.","##.##.##",".######.","#.####.#",".######.","#..##..#"];
const STAR=["...##...","...##...","########",".######.","..####..",".##..##.","##....##","........"];
const I_CHECK=["........",".......#","......##","#....##.","##..##..",".####...","..##....","........"];
const I_PEN=["......##",".....###","....###.","...###..","..###...",".###....",".##.....","#......."];
const I_COPY=["#####...","#...#...","#.######","#.##...#","###.#..#","..#....#","..#....#","..######"];
const I_X=["##....##","###..###",".######.","..####..","..####..",".######.","###..###","##....##"];
function pix(rows){let r="";rows.forEach((row,y)=>{[...row].forEach((c,x)=>{if(c==="#")r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;});});
 return `<svg viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g fill="currentColor">${r}</g></svg>`;}

/* ---------- derivados del contenido ---------- */
const CARD_ORDER=Object.keys(CARDS);
const BUG_MISSIONS=[...new Set(Object.values(BUGS).map(b=>b.m))];
const SPEC_FLAGS=SPEC.filter(s=>s.f).length;
const TOTAL_BUGS=Object.keys(BUGS).length;
const TOTAL_UNITS=TOTAL_BUGS+SPEC_FLAGS+MNEMO.length;
const levelNum=id=>LEVELS.findIndex(l=>l.id===id)+1;
const bugIds=m=>Object.keys(BUGS).filter(k=>BUGS[k].m===m);

/* ---------- estado guardado ---------- */
const KEY="caceria-heuristica-v1";
const VERSION=2;
const blank=()=>({ver:VERSION,xp:0,found:{},cards:{},hints:Object.fromEntries(BUG_MISSIONS.map(m=>[m,0])),forge:{},spec:{best:0,perfect:false},badges:{},firstTry:0});
const isObj=o=>o&&typeof o==="object"&&!Array.isArray(o);
const pick=(o,valid)=>Object.fromEntries(Object.entries(isObj(o)?o:{}).filter(([k])=>valid.includes(k)));
/* Normaliza cualquier objeto (de localStorage o de un archivo importado): descarta claves desconocidas
   y aplica migraciones de versiones anteriores. */
function normalize(o){
 const b=blank();if(!isObj(o))return b;
 const s=b;
 s.xp=Math.max(0,Math.floor(+o.xp||0));
 s.firstTry=Math.max(0,Math.floor(+o.firstTry||0));
 s.found=Object.fromEntries(Object.entries(pick(o.found,Object.keys(BUGS))).map(([k,f])=>[k,{ok:!!(f&&f.ok),card:f&&CARDS[f.card]?f.card:LABEL[BUGS[k].ok[0]],pick:f&&typeof f.pick==="string"?f.pick:null,detail:f&&typeof f.detail==="string"?f.detail.slice(0,600):null}]));
 s.cards=Object.fromEntries(Object.keys(pick(o.cards,CARD_ORDER)).map(k=>[k,true]));
 s.forge=Object.fromEntries(Object.keys(pick(o.forge,MNEMO.map(m=>m.id))).map(k=>[k,true]));
 s.badges=pick(o.badges,BADGES.map(x=>x.id));
 if(isObj(o.hints))BUG_MISSIONS.forEach(m=>{s.hints[m]=Math.max(0,Math.min(HINTS[m].length,Math.floor(+o.hints[m]||0)));});
 if(isObj(o.spec)){s.spec.best=Math.max(0,Math.min(SPEC_FLAGS,Math.floor(+o.spec.best||0)));s.spec.perfect=!!o.spec.perfect;}
 /* v1 → v2: si se elegía la heurística alternativa, la carta principal del bug nunca se desbloqueaba
    (por ejemplo «Inundación» o «Días siempre inválidos»). Se desbloquea ahora. */
 Object.keys(s.found).forEach(k=>{s.cards[LABEL[BUGS[k].ok[0]]]=true;s.cards[s.found[k].card]=true;});
 Object.keys(s.forge).forEach(k=>{s.cards[k]=true;});
 if(s.spec.best>=4)s.cards["spec-watchlist"]=true;
 s.ver=VERSION;
 return s;
}
function load(){try{const r=localStorage.getItem(KEY);if(r)return normalize(JSON.parse(r));}catch(e){}return blank();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

const nFound=()=>Object.keys(S.found).length;
const nForge=()=>Object.keys(S.forge).length;
const progress=()=>Math.min(1,(nFound()+S.spec.best+nForge())/TOTAL_UNITS);
const missionDone=m=>bugIds(m).every(k=>S.found[k]);
function levelProg(id){
 if(id==="detective")return [S.spec.best,SPEC_FLAGS];
 if(id==="forja")return [nForge(),MNEMO.length];
 const ids=bugIds(id);return [ids.filter(k=>S.found[k]).length,ids.length];
}
const RANKS=[[0,"Aprendiz"],[200,"Rastreador"],[450,"Cazabugs"],[750,"Estratega"],[1000,"Leyenda heurística"]];
function rank(){let i=0;RANKS.forEach((r,j)=>{if(S.xp>=r[0])i=j;});const cur=RANKS[i],nx=RANKS[i+1];return {name:cur[1],frac:nx?(S.xp-cur[0])/(nx[0]-cur[0]):1,next:nx?nx[0]:null};}
const bar=(f,cls,label)=>`<div class="bar ${cls||""}" role="progressbar" aria-label="${esc(label||"Progreso")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(f*100)}"><i style="width:${Math.max(0,Math.min(100,f*100))}%"></i></div>`;

const BADGES=[
 {id:"primer-bicho",n:"Primer bicho",d:"Encuentra tu primer bug.",ok:()=>nFound()>=1},
 {id:"unicode",n:"Domador de Unicode",d:"Rompe la app con acentos y con emojis.",ok:()=>S.found["r-acentos"]&&S.found["r-emoji"]},
 {id:"doble-clic",n:"Detective del doble clic",d:"Descubre el bug de inundación.",ok:()=>!!S.found["r-flood"]},
 {id:"bisiesto",n:"Sobreviviente del 29 de febrero",d:"Encuentra el bug del año bisiesto.",ok:()=>!!S.found["f-bisiesto"]},
 {id:"reloj",n:"Viajero del tiempo",d:`Encuentra los ${bugIds("recordatorios").length} bugs de fechas y horas.`,ok:()=>missionDone("recordatorios")},
 {id:"organizador",n:"Organizador del caos",d:`Encuentra los ${bugIds("lista").length} bugs de la lista de tareas.`,ok:()=>missionDone("lista")},
 {id:"rompe-apis",n:"Rompe-APIs",d:`Encuentra los ${bugIds("api").length} bugs de la API.`,ok:()=>missionDone("api")},
 {id:"ojo",n:"Ojo de editor",d:`Marca las ${SPEC_FLAGS} frases problemáticas sin falsos positivos.`,ok:()=>S.spec.perfect},
 {id:"memoria",n:"Memoria de elefante",d:`Forja las ${MNEMO.length} mnemotecnias.`,ok:()=>nForge()>=MNEMO.length},
 {id:"sin-pistas",n:"Sin pistas",d:"Completa una misión de bugs sin pedir pistas.",ok:()=>BUG_MISSIONS.some(m=>missionDone(m)&&S.hints[m]===0)},
 {id:"certero",n:"Clasificador certero",d:"Clasifica 10 bugs al primer intento.",ok:()=>S.firstTry>=10},
 {id:"coleccionista",n:"Coleccionista",d:`Desbloquea las ${CARD_ORDER.length} cartas del Códice.`,ok:()=>CARD_ORDER.every(k=>S.cards[k])},
 {id:"leyenda",n:"Leyenda heurística",d:"Llega al 100 % de progreso.",ok:()=>progress()>=1}
];
let S=load();

function checkBadges(){BADGES.forEach(b=>{if(!S.badges[b.id]&&b.ok()){S.badges[b.id]=true;toast("Insignia: "+b.n);}});save();}
function unlock(id){if(id&&CARDS[id]&&!S.cards[id]){S.cards[id]=true;toast("Nueva carta: "+CARDS[id].n);}}
function toast(msg){const t=document.createElement("div");t.className="toast";t.textContent=msg;$("#toasts").appendChild(t);setTimeout(()=>t.remove(),3200);}

/* ---------- router (con historial del navegador) ---------- */
const ROUTES=["inicio"].concat(LEVELS.map(l=>l.id),["codice","logros"]);
const NAV=[["inicio","Mapa"]].concat(LEVELS.map((l,i)=>[l.id,`${i+1} ${l.nav}`]),[["codice","Códice"],["logros","Logros"]]);
const TITLES={inicio:"Mapa",codice:"Códice",logros:"Logros"};LEVELS.forEach(l=>TITLES[l.id]=l.n);
const routeFromHash=()=>{const h=decodeURIComponent(location.hash.slice(1));return ROUTES.includes(h)?h:"inicio";};
let cur=routeFromHash();
function go(r){if(!ROUTES.includes(r))r="inicio";if(r===cur&&location.hash==="#"+r){render();return;}location.hash=r;}
window.addEventListener("hashchange",()=>{const r=routeFromHash();if(r===cur)return;cur=r;confirmReset=false;render({route:true});window.scrollTo(0,0);});

function renderHUD(){
 const rk=rank();
 $("#hud").innerHTML=`<div class="wrap">
  <button class="brand" data-go="inicio">${pix(BUG)}<span>Cacería Heurística</span></button>
  <div class="stat"><p class="lbl">Rango</p><b>${esc(rk.name)}</b></div>
  <div class="stat"><p class="lbl">XP ${S.xp}${rk.next?" / "+rk.next:""}</p>${bar(rk.frac,"","XP hacia el siguiente rango")}</div>
  <div class="stat"><p class="lbl">Progreso</p><b>${Math.round(progress()*100)} %</b></div>
  <nav class="nav" aria-label="Secciones">${NAV.map(([r,l])=>`<button data-go="${r}" ${r===cur?'aria-current="page"':""}>${esc(l)}</button>`).join("")}</nav>
 </div>`;
}
/* Devuelve un selector que identifica al elemento con foco por su atributo data-*, para restaurarlo tras re-renderizar. */
function focusKey(){const a=document.activeElement;if(!a||a===document.body)return null;
 if(a.id)return "#"+CSS.escape(a.id);
 const at=[...a.attributes].find(x=>x.name.startsWith("data-"));return at?`[${at.name}="${CSS.escape(at.value)}"]`:null;}
function restoreFocus(key){if(!key)return;let el=document.querySelector(key);
 if(el&&el.disabled){el=key.startsWith("[data-bank")?(document.querySelector("[data-bank]:not(:disabled)")||document.querySelector("[data-forge-check]")):null;}
 if(el&&!modalOpen)el.focus({preventScroll:true});}
function render(opt){
 const key=opt&&opt.route?null:focusKey();
 renderHUD();const v=$("#view");v.innerHTML=`<div class="view">${VIEWS[cur]()}</div>`;AFTER[cur]&&AFTER[cur]();
 document.title=(cur==="inicio"?"":TITLES[cur]+" · ")+"Cacería Heurística";
 if(opt&&opt.route)v.focus({preventScroll:true});else restoreFocus(key);
}
function refreshSide(){const s=$("#side");const key=focusKey();if(s)s.innerHTML=sideHTML(cur);renderHUD();
 if(key&&key.startsWith("[data-hint")){const hs=$$(".hint");const h=hs[hs.length-1]||document.querySelector("[data-hint]");h&&h.focus();}else restoreFocus(key);}

/* ---------- vistas ---------- */
let wisdomI=Math.floor(Math.random()*WISDOM.length);
const VIEWS={};const AFTER={};

VIEWS.inicio=()=>{
 const nextL=LEVELS.find(l=>{const [a,b]=levelProg(l.id);return a<b;});
 const pr=progress();
 return `<section class="hero">
  <div><p class="lbl">Juego de heurísticas de prueba</p>
   <h1>Cacería<br>Heurística</h1>
   <p class="lead">TaskPal es una app de tareas con bugs escondidos a propósito. Explórala como lo haría una persona tester, nombra la heurística que te llevó a cada bug y colecciona las cartas del Códice.</p>
   <div class="row">${nextL?`<button class="btn" data-go="${nextL.id}">${pr>0?"Continuar":"Empezar"}: ${esc(nextL.n)}</button>`:`<button class="btn" data-go="logros">Ver mis logros</button>`}<button class="btn ghost" data-go="codice">Abrir el Códice</button></div>
  </div>
  <div class="hero-art">${pix(BUG)}</div>
 </section>
 <section class="final px" aria-label="Progreso final">
  <div class="final-top"><p class="lbl">Progreso final</p><b>${Math.round(pr*100)} %</b></div>
  ${bar(pr,"big","Progreso final")}
  <div class="counts">
   <div><span>${nFound()}/${TOTAL_BUGS}</span><small>bugs encontrados</small></div>
   <div><span>${S.spec.best}/${SPEC_FLAGS}</span><small>puntaje en la spec</small></div>
   <div><span>${nForge()}/${MNEMO.length}</span><small>mnemotecnias</small></div>
   <div><span>${Object.keys(S.cards).length}/${CARD_ORDER.length}</span><small>cartas</small></div>
  </div>
  ${pr>=1?`<p class="win">Completaste la cacería. Ya piensas en variables, límites y riesgos antes de tocar el teclado.</p>`:""}
 </section>
 <section class="levels" aria-label="Niveles">${LEVELS.map((l,i)=>{const [a,b]=levelProg(l.id);return `<article class="tile px ${a>=b?"done":""}">
   <span class="lvl">Nivel ${i+1}${a>=b?" · completo":""}</span><h3>${esc(l.n)}</h3><p>${esc(l.d)}</p>${bar(a/b,"","Progreso de "+l.n)}
   <div class="row"><span class="mini">${a}/${b}</span><button class="btn ${a>=b?"ghost":""}" data-go="${l.id}">${a===0?"Jugar":a>=b?"Repasar":"Seguir"}</button></div></article>`;}).join("")}</section>
 <section class="how" aria-label="Cómo se juega">
  <div class="px"><b>1</b><p>Explora la app simulada. Escribe valores raros, repite acciones, cambia el orden. No hay instrucciones: tú decides qué probar.</p></div>
  <div class="px"><b>2</b><p>Cuando algo se comporte mal, la bitácora lo detecta. Elige qué heurística te llevó ahí: 30 XP al primer intento, 10 si te equivocas.</p></div>
  <div class="px"><b>3</b><p>Cada bug desbloquea una carta del Códice con la heurística, un ejemplo y con qué combinarla. Desde la bitácora puedes repasar cada hallazgo.</p></div>
 </section>
 <section class="wisdom px"><p class="lbl">Sabiduría del tester</p><blockquote>«${esc(WISDOM[wisdomI])}»</blockquote><div><button class="btn ghost" data-wisdom>Otra frase</button></div></section>`;
};

function sideHTML(m){
 const ids=bugIds(m);const n=ids.filter(k=>S.found[k]).length;
 const shown=HINTS[m].slice(0,S.hints[m]);
 return `<div class="px side-box"><p class="lbl">Bitácora de bugs</p><p class="big">${n}/${ids.length}</p>${bar(n/ids.length,"","Bugs encontrados en esta misión")}
  <ul class="found">${ids.map(k=>{const f=S.found[k];return f?`<li class="has-review"><button data-review="${k}" aria-label="Repasar: ${esc(BUGS[k].t)}"><b>${esc(BUGS[k].t)}</b><span class="${f.ok?"":"help"}">${esc(CARDS[f.card]?CARDS[f.card].n:"")}${f.ok?"":" (con ayuda)"}</span></button></li>`:`<li class="unk">?? bug sin descubrir</li>`;}).join("")}</ul>
  ${n===ids.length?`<p class="muted" style="margin:12px 0 0">Misión completa.</p>`:n?`<p class="muted" style="margin:12px 0 0;font-size:14px">Toca un hallazgo para repasarlo.</p>`:""}</div>
  <div class="px side-box"><p class="lbl">Pistas</p>${shown.map(h=>`<p class="hint" tabindex="-1">${esc(h)}</p>`).join("")}
  ${S.hints[m]<HINTS[m].length?`<button class="btn ghost" data-hint="${m}">Pedir pista ${S.hints[m]+1} de ${HINTS[m].length}</button>`:`<p class="muted" style="margin:0">Ya no quedan pistas.</p>`}</div>`;
}
const head=(id,d)=>`<div class="m-head"><div><p class="lbl">Nivel ${levelNum(id)}</p><h2>${esc(TITLES[id])}</h2><p>${d}</p></div></div>`;
const phone=(inner,id)=>`<div class="phone px"><div class="phone-bar"><span>TaskPal</span><span>9:41</span></div><div class="screen" id="${id}">${inner}</div></div>`;
const nBugs=m=>bugIds(m).length;

/* ----- Nivel: registro ----- */
function seedAccounts(){return [{nombre:"Ana López",correo:"ana@correo.mx",edad:29},{nombre:"Beto Salas",correo:"beto@correo.mx",edad:34}];}
const reg={accounts:seedAccounts(),last:0,lastEmail:""};
VIEWS.registro=()=>`${head("registro",`Crea cuentas en TaskPal. El formulario ya viene lleno con datos válidos: cámbialos para encontrar ${nBugs("registro")} bugs.`)}
 <div class="mission"><div class="stage">
  ${phone(`<h3 class="app-h">Crea tu cuenta</h3>
   <form id="reg-form" novalidate>
    <label for="reg-nombre">Nombre</label><input id="reg-nombre" value="Carla Ruiz" autocomplete="off">
    <label for="reg-correo">Correo</label><input id="reg-correo" value="carla@correo.mx" autocomplete="off">
    <label for="reg-edad">Edad</label><input id="reg-edad" value="24" autocomplete="off" inputmode="numeric">
    <label for="reg-pass">Contraseña</label><input id="reg-pass" value="tareas2026" autocomplete="off">
    <ul class="rules"><li>Edad: de 13 a 120 años</li><li>Contraseña: 8 caracteres o más</li><li>Un correo por cuenta</li></ul>
    <button class="app-btn" type="submit">Crear cuenta</button>
   </form>
   <div class="app-msg" id="reg-msg" aria-live="polite"></div>
   <div class="crash" id="reg-crash" hidden><p>TaskPal se detuvo.</p><button class="app-btn" type="button" data-reopen>Reabrir la app</button></div>`,"reg-screen")}
  <div class="admin px"><p class="lbl">Vista de administración · usuarios</p><div class="tbl" id="reg-admin"></div><p class="muted" style="font-size:14px;margin:10px 0 0">Esta vista es un punto de observación (TouchPoint): úsala para verificar qué se guardó realmente.</p><div class="row" style="margin-top:12px"><button class="btn ghost" data-reset-mission="registro">Restaurar datos</button></div></div>
 </div><aside class="side" id="side">${sideHTML("registro")}</aside></div>`;
const EMOJI=/\p{Extended_Pictographic}/u;
const ACCENT=/[À-ÖØ-öø-ÿĀ-žḀ-ỿ぀-ヿ一-鿿]/;
function mojibake(s){const b=new TextEncoder().encode(s);let o="";for(const x of b)o+=(x>=0x80&&x<0xa0)?"©":String.fromCharCode(x);return o;}
function regAdmin(){const el=$("#reg-admin");if(!el)return;el.innerHTML=`<table><thead><tr><th>#</th><th>nombre</th><th>correo</th><th>edad</th></tr></thead><tbody>${reg.accounts.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a.nombre.length>28?a.nombre.slice(0,28)+"…":a.nombre)}</td><td>${esc(a.correo)}</td><td>${esc(a.edad)}</td></tr>`).join("")}</tbody></table>`;}
function regMsg(kind,t){$("#reg-msg").innerHTML=`<span class="${kind}">${esc(t)}</span>`;}
AFTER.registro=()=>{
 regAdmin();
 $("#reg-form").addEventListener("submit",e=>{
  e.preventDefault();
  const nombre=$("#reg-nombre").value,correo=$("#reg-correo").value.trim(),edadS=$("#reg-edad").value.trim(),pass=$("#reg-pass").value;
  const now=Date.now();const quick=now-reg.last<1500;
  if(nombre.length===0)return regMsg("err","El nombre es obligatorio.");
  if(EMOJI.test(nombre)){$("#reg-msg").innerHTML="";$("#reg-crash").hidden=false;$("#reg-crash button").focus();triggerBug("r-emoji",`nombre = "${nombre}"\nFATAL: RangeError en medirAncho()\nla app se cerró`);return;}
  if(!correo.includes("."))return regMsg("err","Correo inválido.");
  if(!/^-?\d+$/.test(edadS))return regMsg("err","Escribe la edad con números.");
  const edad=parseInt(edadS,10);
  if(edad>120)return regMsg("err","Edad inválida.");
  if(edad>=0&&edad<=13){regMsg("err","Debes tener al menos 13 años.");if(edad===13)triggerBug("r-edad-13",`edad = 13\nrespuesta: "Debes tener al menos 13 años."`);return;}
  if(pass.length<8)return regMsg("err","La contraseña necesita al menos 8 caracteres.");
  const dup=reg.accounts.some(a=>a.correo.toLowerCase()===correo.toLowerCase());
  const shown=nombre.length>64?"undefined":(ACCENT.test(nombre)?mojibake(nombre):nombre);
  reg.accounts.push({nombre:shown,correo,edad});
  regMsg("ok",`Cuenta creada. ¡Bienvenido, ${shown}!`);
  regAdmin();
  if(nombre.trim()==="")triggerBug("r-espacios",`nombre = "${nombre}"  (${nombre.length} espacios)\nsaludo: "¡Bienvenido, ${nombre}!"`);
  if(nombre.length>64)triggerBug("r-largo",`longitud del nombre = ${nombre.length}\nguardado como: "undefined"`);
  else if(ACCENT.test(nombre))triggerBug("r-acentos",`escribiste: "${nombre}"\nse guardó:  "${shown}"`);
  if(!correo.includes("@"))triggerBug("r-correo",`correo = "${correo}"\nrespuesta: cuenta creada`);
  if(edad<0)triggerBug("r-edad-neg",`edad = ${edad}\nrespuesta: cuenta creada`);
  const nDup=()=>reg.accounts.filter(a=>a.correo.toLowerCase()===correo.toLowerCase()).length;
  if(dup){if(quick&&correo.toLowerCase()===reg.lastEmail)triggerBug("r-flood",`2 envíos en ${now-reg.last} ms\ncuentas con ${correo}: ${nDup()}`);else triggerBug("r-unico",`correo = ${correo}\ncuentas con ese correo: ${nDup()}`);}
  reg.last=now;reg.lastEmail=correo.toLowerCase();
 });
};

/* ----- Nivel: recordatorios ----- */
const MES=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MAXDIA=[31,29,31,30,31,30,31,31,31,31,30,31]; // ← contiene bugs a propósito
const ZONAS={cdmx:"Ciudad de México (UTC−6)",tij:"Tijuana (UTC−8, con horario de verano)",ny:"Nueva York (UTC−5, con horario de verano)",mad:"Madrid (UTC+1, con horario de verano)"};
const zonaCorta=z=>ZONAS[z].split(" (")[0];
const leap=y=>(y%4===0&&y%100!==0)||y%400===0;
function seedReminders(){return [{titulo:"Junta de equipo",fecha:"3 de noviembre de 2026",hora:"10:00",zona:"cdmx",dev:"10:00"}];}
const rec={list:seedReminders()};
VIEWS.recordatorios=()=>`${head("recordatorios",`Programa recordatorios. Tu dispositivo está en la Ciudad de México. Hay ${nBugs("recordatorios")} bugs escondidos en fechas, horas y zonas horarias.`)}
 <div class="mission"><div class="stage">
  ${phone(`<h3 class="app-h">Nuevo recordatorio</h3>
   <form id="rec-form" novalidate>
    <label for="rec-titulo">Título</label><input id="rec-titulo" value="Entregar reporte" autocomplete="off">
    <label for="rec-fecha">Fecha (dd/mm/aaaa)</label><input id="rec-fecha" value="15/11/2026" autocomplete="off">
    <label for="rec-hora">Hora</label><input id="rec-hora" value="09:30" autocomplete="off">
    <p class="note">Acepta 24 h (21:15) o 12 h (9:15 pm).</p>
    <label for="rec-zona">Zona horaria del evento</label>
    <select id="rec-zona">${Object.entries(ZONAS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select>
    <button class="app-btn" type="submit">Programar</button>
   </form>
   <div class="app-msg" id="rec-msg" aria-live="polite"></div>
   <ul class="rem-list" id="rec-list"></ul>`,"rec-screen")}
  <div class="px side-box"><p class="lbl">Reloj del dispositivo</p><p style="margin:0 0 8px">América/Ciudad de México, UTC−6. Sin horario de verano desde 2022.</p><p class="muted" style="margin:0;font-size:14px">La app debería convertir la hora del evento a la hora de tu dispositivo. Compara ambas columnas en cada recordatorio.</p><div class="row" style="margin-top:12px"><button class="btn ghost" data-reset-mission="recordatorios">Restaurar datos</button></div></div>
 </div><aside class="side" id="side">${sideHTML("recordatorios")}</aside></div>`;
function recList(){const el=$("#rec-list");if(!el)return;el.innerHTML=rec.list.slice().reverse().map(r=>`<li><b>${esc(r.titulo)}</b><span>${esc(r.fecha)} · ${esc(r.hora)} en ${esc(zonaCorta(r.zona))}</span><span>En tu dispositivo: ${esc(r.dev)}</span></li>`).join("");}
function recMsg(kind,t){$("#rec-msg").innerHTML=`<span class="${kind}">${esc(t)}</span>`;}
AFTER.recordatorios=()=>{
 recList();
 $("#rec-form").addEventListener("submit",e=>{
  e.preventDefault();
  const titulo=$("#rec-titulo").value.trim(),fs=$("#rec-fecha").value.trim(),hs=$("#rec-hora").value.trim(),zona=$("#rec-zona").value;
  if(!titulo)return recMsg("err","Escribe un título.");
  let d,mo,y,fechaStr,iso=false;
  let m=fs.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m){iso=true;d=+m[1];mo=+m[2];y=+m[3];fechaStr=`${d} de ${MES[mo-1]||"¿mes "+mo+"?"} del año ${y}`;}
  else{m=fs.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
   if(!m)return recMsg("err","Fecha inválida. Usa dd/mm/aaaa.");
   d=+m[1];mo=+m[2];y=+m[3];
   if(mo<1||mo>12)return recMsg("err","Ese mes no existe.");
   if(d<1||d>MAXDIA[mo-1])return recMsg("err","Ese día no existe.");
   fechaStr=`${d} de ${MES[mo-1]} de ${y}`;}
  const h=hs.match(/^(\d{1,2}):(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/i);
  if(!h)return recMsg("err","Hora inválida. Ejemplos: 21:15 o 9:15 pm.");
  let hh=+h[1];const mm=+h[2];const mer=h[3]?(h[3].toLowerCase().startsWith("a")?"am":"pm"):null;
  if(mm>59)return recMsg("err","Los minutos van de 00 a 59.");
  let real;
  if(mer){if(hh<1||hh>12)return recMsg("err","Con am/pm la hora va de 1 a 12.");
   real=mer==="am"?(hh===12?0:hh):(hh===12?12:hh+12);
   hh=mer==="pm"?hh+12:hh;}
  else{if(hh>23)return recMsg("err","La hora va de 00 a 23.");real=hh;}
  const hora=`${p2(hh)}:${p2(mm)}`;
  rec.list.push({titulo,fecha:fechaStr,hora,zona,dev:hora});
  recList();recMsg("ok",`Listo: «${titulo}» programado.`);
  if(iso)triggerBug("f-iso",`escribiste: ${fs}\nla app entendió: ${fechaStr}`);
  if(!iso&&mo===9&&d===31)triggerBug("f-31sep",`fecha aceptada: ${fechaStr}`);
  if(!iso&&mo===2&&d===29&&!leap(y))triggerBug("f-bisiesto",`fecha aceptada: ${fechaStr}\n${y} no es bisiesto`);
  if(mer&&+h[1]===12)triggerBug("f-ampm",`escribiste: ${hs}\nla app guardó: ${hora}\ncorrecto: ${p2(real)}:${p2(mm)}`);
  if(zona!=="cdmx")triggerBug("f-zona",`evento: ${hora} en ${zonaCorta(zona)}\ndispositivo (CDMX): ${hora}\n¿no debería ser distinta?`);
  const usa=(zona==="ny"||zona==="tij")&&((y===2026&&mo===3&&d===8)||(y===2027&&mo===3&&d===14));
  const eu=zona==="mad"&&((y===2026&&mo===3&&d===29)||(y===2027&&mo===3&&d===28));
  if(!iso&&real===2&&(usa||eu))triggerBug("f-dst",`${fechaStr}, ${p2(real)}:${p2(mm)} en ${zonaCorta(zona)}\nese día el reloj salta de 01:59 a 03:00`);
 });
};

/* ----- Nivel: lista de tareas ----- */
const LIST_MAX=10; // ← la vista corta aquí y no hay paginación (bug plantado)
let uidN=1;
function mkEntry(titulo,completada){const d={titulo,completada:!!completada};return {uid:uidN++,d};}
function seedList(){uidN=1;const ls=[["Comprar café",false],["Revisar PR #42",true],["Pagar la luz",false],["Llamar al dentista",false],["Preparar la demo",false]].map(([t,c])=>mkEntry(t,c));
 const idx={};ls.forEach(e=>idx[e.uid]=e.d.titulo.toLowerCase());return {list:ls,idx};}
const lst={sel:new Set(),q:"",editing:null,orig:"",msg:null};
Object.assign(lst,seedList());
VIEWS.lista=()=>`${head("lista",`Organiza tus pendientes. Agrega, edita, duplica, ordena, busca y borra tareas. Hay ${nBugs("lista")} bugs escondidos.`)}
 <div class="mission"><div class="stage">
  ${phone(`<h3 class="app-h">Mis tareas</h3>
   <form id="lst-form" novalidate><label for="lst-new" class="sr-only">Nueva tarea</label>
    <div class="lst-add"><input id="lst-new" placeholder="Nueva tarea" autocomplete="off"><button class="app-btn" type="submit">Agregar</button></div></form>
   <div class="lst-tools"><label for="lst-q" class="sr-only">Buscar tareas</label><input id="lst-q" type="search" placeholder="Buscar" autocomplete="off" value="${esc(lst.q)}"><button type="button" data-lst-sort>A–Z</button></div>
   <p class="lst-sum" id="lst-sum" aria-live="polite"></p>
   <ul class="lst" id="lst-ul"></ul>
   <button type="button" class="lst-bulk" data-lst-bulk>Completar seleccionadas</button>
   <div class="app-msg" id="lst-msg" aria-live="polite"></div>`,"lst-screen")}
  <div class="admin px"><p class="lbl">Vista de datos · almacenamiento</p><div class="tbl" id="lst-admin"></div><p class="muted" style="font-size:14px;margin:10px 0 0">Lo que está guardado de verdad, sin filtros. Compáralo con lo que muestra la pantalla.</p><div class="row" style="margin-top:12px"><button class="btn ghost" data-reset-mission="lista">Restaurar datos</button></div></div>
 </div><aside class="side" id="side">${sideHTML("lista")}</aside></div>`;
function lstAdmin(){const el=$("#lst-admin");if(!el)return;el.innerHTML=lst.list.length?`<table><thead><tr><th>#</th><th>título</th><th>estado</th></tr></thead><tbody>${lst.list.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.d.titulo.length>26?e.d.titulo.slice(0,26)+"…":e.d.titulo)}</td><td>${e.d.completada?"hecha":"pendiente"}</td></tr>`).join("")}</tbody></table>`:`<p class="muted" style="margin:0">(sin registros)</p>`;}
function lstMsg(kind,t){const el=$("#lst-msg");if(el)el.innerHTML=t?`<span class="${kind}">${esc(t)}</span>`:"";}
function lstRender(){
 const ul=$("#lst-ul");if(!ul)return;
 const total=lst.list.length,done=lst.list.filter(e=>e.d.completada).length;
 const pct=Math.round(done/total*100); // ← 0/0 = NaN (bug plantado)
 $("#lst-sum").textContent=`${plural(total,"tarea","tareas")} · ${done} ${done===1?"completada":"completadas"} · ${pct} %`;
 const q=lst.q.trim().toLowerCase();
 const vis=(q?lst.list.filter(e=>(lst.idx[e.uid]||"").includes(q)):lst.list).slice(0,LIST_MAX);
 ul.innerHTML=vis.map(e=>{
  if(lst.editing===e.uid)return `<li class="lst-item editing"><div class="lst-edit"><label for="lst-edit-in" class="sr-only">Editar título</label><input id="lst-edit-in" value="${esc(e.d.titulo)}" autocomplete="off"><div class="row"><button type="button" class="app-btn" data-lst-save="${e.uid}">Guardar</button><button type="button" class="app-btn alt" data-lst-cancel="${e.uid}">Cancelar</button></div></div></li>`;
  const t=esc(e.d.titulo);
  return `<li class="lst-item ${e.d.completada?"done":""}"><input type="checkbox" data-lst-sel="${e.uid}" ${lst.sel.has(e.uid)?"checked":""} aria-label="Seleccionar «${t}»"><span class="t">${t}</span><span class="acts">
   <button type="button" data-lst-toggle="${e.uid}" aria-label="${e.d.completada?"Marcar como pendiente":"Marcar como hecha"}: «${t}»" title="${e.d.completada?"Marcar como pendiente":"Marcar como hecha"}">${pix(I_CHECK)}</button>
   <button type="button" data-lst-edit="${e.uid}" aria-label="Editar «${t}»" title="Editar">${pix(I_PEN)}</button>
   <button type="button" data-lst-dup="${e.uid}" aria-label="Duplicar «${t}»" title="Duplicar">${pix(I_COPY)}</button>
   <button type="button" data-lst-del="${e.uid}" aria-label="Borrar «${t}»" title="Borrar">${pix(I_X)}</button></span></li>`;}).join("");
 if(!vis.length)ul.innerHTML=`<li class="lst-empty">${q?"Ninguna tarea coincide con la búsqueda.":"No hay tareas. ¡Agrega una!"}</li>`;
 lstAdmin();
 if(total===0)triggerBug("l-cero",`total = 0, completadas = 0\nprogreso = 0 / 0 × 100 = ${pct} %`);
 if(q){const miss=lst.list.find(e=>e.d.titulo.toLowerCase().includes(q)&&!(lst.idx[e.uid]||"").includes(q));
  if(miss)triggerBug("l-buscar",`búsqueda: "${lst.q.trim()}"\ntarea guardada: "${miss.d.titulo}"\níndice de búsqueda: "${lst.idx[miss.uid]}"\nresultado: no aparece`);}
 if(lst.editing){const inp=$("#lst-edit-in");if(inp){inp.addEventListener("input",()=>{const e=lst.list.find(x=>x.uid===lst.editing);if(e){e.d.titulo=inp.value;lstAdmin();}});}}
}
const lstFind=uid=>lst.list.find(e=>e.uid===uid);
function lstAfterAdd(){if(lst.list.length>LIST_MAX)triggerBug("l-muchos",`tareas guardadas: ${lst.list.length}\ntareas visibles: ${Math.min(LIST_MAX,lst.list.length)}\npaginación: ninguna`);}
function lstCloseEdit(uid,saved){
 const e=lstFind(uid);if(!e){lst.editing=null;return lstRender();}
 const now=e.d.titulo,orig=lst.orig;
 if(saved&&now.trim()===""){e.d.titulo=orig;lstMsg("err","El título no puede quedar vacío.");}
 else if(saved)lstMsg("ok","Cambios guardados.");
 else lstMsg("ok","Edición cancelada.");
 lst.editing=null;lstRender();
 const changed=e.d.titulo!==orig;
 if(!saved&&changed)triggerBug("l-cancelar",`antes:   "${orig}"\neditaste: "${now}"\npresionaste Cancelar\nguardado: "${e.d.titulo}"`);
 if(changed&&lst.list.some(x=>x!==e&&x.d===e.d)){const n=lst.list.filter(x=>x.d===e.d).length;triggerBug("l-duplicar",`editaste una copia: "${e.d.titulo}"\ntareas que cambiaron: ${n}`);}
 const b=document.querySelector(`[data-lst-edit="${uid}"]`);b&&b.focus();
}
AFTER.lista=()=>{
 lstRender();
 $("#lst-form").addEventListener("submit",ev=>{ev.preventDefault();const inp=$("#lst-new");const t=inp.value.trim();
  if(!t){lstMsg("err","Escribe una tarea.");return;}
  const e=mkEntry(t,false);lst.list.push(e);lst.idx[e.uid]=t.toLowerCase();inp.value="";lstMsg("ok",`Agregada: «${t}».`);lstRender();lstAfterAdd();inp.focus();});
 $("#lst-q").addEventListener("input",ev=>{lst.q=ev.target.value;lstRender();});
};
function lstClick(d){
 if(d.lstSort!==undefined){
  const before=lst.list.map(e=>e.d.titulo);
  lst.list.sort((a,b)=>a.d.titulo<b.d.titulo?-1:a.d.titulo>b.d.titulo?1:0); // ← compara códigos de carácter (bug plantado)
  const got=lst.list.map(e=>e.d.titulo);const want=before.slice().sort((a,b)=>a.localeCompare(b,"es",{sensitivity:"base"}));
  lstMsg("ok","Ordenadas de la A a la Z.");lstRender();
  if(got.some((t,i)=>t.localeCompare(want[i],"es",{sensitivity:"base"})!==0))triggerBug("l-orden",`orden de la app:\n  ${got.join("\n  ")}\norden esperado:\n  ${want.join("\n  ")}`);
  return true;}
 if(d.lstBulk!==undefined){
  if(lst.sel.size===0){const n=lst.list.filter(e=>!e.d.completada).length;lst.list.forEach(e=>e.d.completada=true);lstMsg("ok","Tareas completadas.");lstRender();
   if(lst.list.length&&n>0)triggerBug("l-ninguna",`seleccionadas: 0\ncompletadas por la acción: ${n}`);else if(!lst.list.length)lstMsg("err","No hay tareas.");}
  else{const n=lst.sel.size;lst.list.forEach(e=>{if(lst.sel.has(e.uid))e.d.completada=true;});lst.sel.clear();lstMsg("ok",`${plural(n,"tarea completada","tareas completadas")}.`);lstRender();}
  return true;}
 if(d.lstToggle!==undefined){const e=lstFind(+d.lstToggle);if(e){e.d.completada=!e.d.completada;lstRender();}return true;}
 if(d.lstEdit!==undefined){const e=lstFind(+d.lstEdit);if(e){if(lst.editing)lstCloseEdit(lst.editing,true);lst.editing=e.uid;lst.orig=e.d.titulo;lstMsg("ok","");lstRender();const inp=$("#lst-edit-in");if(inp){inp.focus();inp.select();}}return true;}
 if(d.lstSave!==undefined){lstCloseEdit(+d.lstSave,true);return true;}
 if(d.lstCancel!==undefined){lstCloseEdit(+d.lstCancel,false);return true;}
 if(d.lstDup!==undefined){const i=lst.list.findIndex(e=>e.uid===+d.lstDup);if(i>=0){const src=lst.list[i];const copy={uid:uidN++,d:src.d}; // ← misma referencia (bug plantado)
   lst.list.splice(i+1,0,copy);lst.idx[copy.uid]=lst.idx[src.uid];lstMsg("ok",`Duplicada: «${src.d.titulo}».`);lstRender();lstAfterAdd();}return true;}
 if(d.lstDel!==undefined){const i=lst.list.findIndex(e=>e.uid===+d.lstDel);if(i<0)return true;
  const n=lst.list.length;const target=(i===n-1&&n>1)?0:i; // ← el último se desborda al inicio (bug plantado)
  const gone=lst.list[target];const wanted=lst.list[i];lst.list.splice(target,1);lst.sel.delete(gone.uid);if(lst.editing===gone.uid)lst.editing=null;
  lstMsg("ok",`Borrada: «${gone.d.titulo}».`);lstRender();
  if(target!==i)triggerBug("l-final",`presionaste borrar en: "${wanted.d.titulo}" (posición ${i+1} de ${n})\nse borró: "${gone.d.titulo}" (posición 1)`);
  const next=document.querySelector("[data-lst-del]");next?next.focus():$("#lst-new")?.focus();
  return true;}
 return false;
}
document.addEventListener("change",ev=>{const c=ev.target.closest&&ev.target.closest("[data-lst-sel]");if(!c)return;const uid=+c.dataset.lstSel;c.checked?lst.sel.add(uid):lst.sel.delete(uid);});

/* ----- Nivel: API ----- */
const api={tasks:null,next:10,res:null,history:[]};
function seedTasks(){return [[1,"Comprar café","ana",2],[2,"Revisar PR #42","ana",4],[3,"Pagar luz","ana",3],[4,"Llamar al dentista","ana",1],[5,"Preparar demo","ana",5],[6,"Renovar pasaporte","beto",4],[7,"Plan de pruebas v2","beto",5],[8,"Cita médica","beto",2],[9,"Regalo para mamá","beto",3]].map(([id,titulo,owner,prioridad])=>({id,titulo,owner,prioridad,completada:false}));}
api.tasks=seedTasks();
const pub=t=>({id:t.id,titulo:t.titulo,prioridad:t.prioridad,completada:t.completada});
const STATUS={200:"OK",201:"Created",204:"No Content",400:"Bad Request",401:"Unauthorized",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",500:"Internal Server Error"};
const R=(s,b)=>({s,b});
function handleApi(method,path,tok,bodyText){
 const user=tok==="ana"||tok==="beto"?tok:null;
 let url;try{url=new URL(path.trim()||"/","https://api.taskpal.mx");}catch(e){return R(400,{error:"URL inválida"});}
 const p=url.pathname.replace(/\/+$/,"")||"/";
 const mId=p.match(/^\/tareas\/(\d+)$/);const isCol=p==="/tareas";
 if(!isCol&&!mId)return R(404,{error:"Ruta no encontrada"});
 const id=mId?+mId[1]:null;const t=mId?api.tasks.find(x=>x.id===id):null;
 if(method==="PATCH"){if(mId){triggerBug("a-patch",`PATCH ${p}\n→ 500 en lugar de 405`);return R(500,{error:"Internal Server Error",trace:"TypeError: handlers.patch is not a function\n    at router.js:88:17\n    at Layer.handle (express/lib/router/layer.js:95:5)"});}return R(405,{error:"Método no permitido"});}
 if(!user){
  if(method==="DELETE"&&mId){if(!t)return R(404,{error:"La tarea no existe"});api.tasks=api.tasks.filter(x=>x.id!==id);triggerBug("a-del",`DELETE ${p}  (sin token)\n→ 204: la tarea "${t.titulo}" se borró`);return R(204,null);}
  return R(401,{error:"Se requiere un token"});
 }
 function body(){if(!bodyText.trim())return {err:R(400,{error:"Se requiere un cuerpo JSON"})};try{const b=JSON.parse(bodyText);if(!b||typeof b!=="object"||Array.isArray(b))return {err:R(400,{error:"El cuerpo debe ser un objeto JSON"})};return {b};}catch(e){return {err:R(400,{error:"JSON inválido"})};}}
 function validate(b){
  if(!("titulo" in b))return R(400,{error:"titulo es obligatorio"});
  if(b.titulo===null){triggerBug("a-null",`POST/PUT con "titulo": null\n→ 500 con stack trace`);return R(500,{error:"Internal Server Error",trace:"TypeError: Cannot read properties of null (reading 'trim')\n    at validarTarea (/srv/taskpal/src/tareas.js:42:31)\n    at /srv/taskpal/src/rutas.js:17:9"});}
  if(typeof b.titulo!=="string")return R(400,{error:"titulo debe ser texto"});
  if("prioridad" in b&&!(Number.isInteger(b.prioridad)&&b.prioridad>=1&&b.prioridad<=5))return R(400,{error:"prioridad debe ser un entero de 1 a 5"});
  return null;
 }
 if(isCol){
  if(method==="GET"){
   const ls=url.searchParams.get("limit");let limit=20;
   if(ls!==null){if(!/^-?\d+$/.test(ls))return R(400,{error:"limit debe ser un entero"});limit=parseInt(ls,10);
    if(limit<0){triggerBug("a-neg",`GET /tareas?limit=${limit}\n→ ${api.tasks.length} tareas de todas las personas + hashes`);return R(200,{total:api.tasks.length,tareas:api.tasks.map(x=>Object.assign(pub(x),{owner_email:x.owner+"@correo.mx",password_hash:"$2b$10$"+(x.owner==="ana"?"Qm9yZWQ/":"Tm90SGVy")+"x9Kz…"}))});}
    if(limit===0||limit>=1000){if(limit===1000)triggerBug("a-lim",`GET /tareas?limit=1000\n→ 400 (la documentación dice máximo 1000)`);return R(400,{error:"limit debe estar entre 1 y 1000"});}}
   const own=api.tasks.filter(x=>x.owner===user);return R(200,{total:own.length,tareas:own.slice(0,limit).map(pub)});
  }
  if(method==="POST"){
   const {b,err}=body();if(err)return err;const v=validate(b);if(v)return v;
   const vacio=b.titulo.trim()==="";
   const nt={id:api.next++,titulo:b.titulo,owner:user,prioridad:b.prioridad||3,completada:false};api.tasks.push(nt);
   if(vacio)triggerBug("a-vacio",`POST /tareas  {"titulo": ${JSON.stringify(b.titulo)}}\n→ 201 Created (id ${nt.id})`);
   return R(201,pub(nt));
  }
  return R(405,{error:"Método no permitido"});
 }
 if(!t)return R(404,{error:"La tarea no existe"});
 if(method==="GET"){if(t.owner!==user)triggerBug("a-idor",`GET ${p} con el token de ${user==="ana"?"Ana":"Beto"}\n→ 200: tarea de ${t.owner==="ana"?"Ana":"Beto"}`);return R(200,pub(t));}
 if(method==="PUT"){if(t.owner!==user)return R(403,{error:"No puedes modificar tareas ajenas"});const {b,err}=body();if(err)return err;const v=validate(b);if(v)return v;if(b.titulo.trim()==="")return R(400,{error:"titulo no puede estar vacío"});t.titulo=b.titulo;if(b.prioridad)t.prioridad=b.prioridad;return R(200,pub(t));}
 if(method==="DELETE"){if(t.owner!==user)return R(403,{error:"No puedes borrar tareas ajenas"});api.tasks=api.tasks.filter(x=>x.id!==id);return R(204,null);}
 return R(405,{error:"Método no permitido"});
}
const sCls=s=>s>=500?"s5":s>=400?"s4":"s2";
function resHTML(method,path,r){
 return `<span class="muted">${esc(method)} ${esc(path)}</span>\n<span class="${sCls(r.s)}">HTTP/1.1 ${r.s} ${STATUS[r.s]||""}</span>\n${r.b===null?"(sin cuerpo)":esc(JSON.stringify(r.b,null,2))}`;}
const TOK_LABEL={ana:"Ana",beto:"Beto",none:"sin token"};
function historyHTML(){if(!api.history.length)return `<p class="muted" style="margin:0;font-size:14px">Aún no envías solicitudes.</p>`;
 return `<ul class="history">${api.history.map((h,i)=>`<li><button data-hist="${i}" title="Cargar esta solicitud en el formulario"><span class="${sCls(h.s)}">${h.s}</span><span>${esc(h.m)} ${esc(h.p)}</span><span class="muted">· ${esc(TOK_LABEL[h.t]||h.t)}</span></button></li>`).join("")}</ul>`;}
const PRESETS=[["Listar mis tareas","GET","/tareas?limit=5","ana",""],["Leer la tarea 2","GET","/tareas/2","ana",""],["Crear tarea","POST","/tareas","ana",'{\n  "titulo": "Escribir casos de prueba",\n  "prioridad": 3\n}'],["Borrar la tarea 3","DELETE","/tareas/3","ana",""]];
VIEWS.api=()=>`${head("api",`Habla directamente con la API REST de TaskPal. Ana es dueña de las tareas 1 a 5 y Beto de las 6 a 9. Hay ${nBugs("api")} bugs.`)}
 <div class="mission"><div style="display:grid;gap:22px;min-width:0">
  <div class="console px">
   <div><p class="lbl">Ejemplos</p><div class="chips">${PRESETS.map((pr,i)=>`<button class="chip" data-preset="${i}">${esc(pr[0])}</button>`).join("")}</div></div>
   <div class="req">
    <div><label for="api-method">Verbo</label><select id="api-method">${["GET","POST","PUT","DELETE","PATCH"].map(m=>`<option>${m}</option>`).join("")}</select></div>
    <div><label for="api-path">Ruta</label><input id="api-path" value="/tareas" autocomplete="off" spellcheck="false"></div>
   </div>
   <div><label for="api-token">Token</label><select id="api-token"><option value="ana">Ana · tok_ana_7f3</option><option value="beto">Beto · tok_beto_19c</option><option value="none">Sin token</option></select></div>
   <div><label for="api-body">Cuerpo JSON (para POST y PUT)</label><textarea id="api-body" spellcheck="false"></textarea></div>
   <div class="row"><button class="btn" data-send>Enviar solicitud</button><button class="btn ghost" data-reset-api>Restaurar datos</button><span class="muted" style="font-size:13px"><span class="kbd">Ctrl</span> + <span class="kbd">Enter</span> envía</span></div>
   <div><p class="lbl">Respuesta</p><pre class="term" id="api-res" aria-live="polite"></pre></div>
   <div><p class="lbl">Historial</p><div id="api-hist">${historyHTML()}</div></div>
  </div>
  <div class="docs px"><p class="lbl">Documentación · api.taskpal.mx</p><dl>
   <dt>GET /tareas?limit={1–1000}</dt><dd>Lista tus tareas. Por omisión, 20.</dd>
   <dt>GET /tareas/{id}</dt><dd>Devuelve una de tus tareas.</dd>
   <dt>POST /tareas</dt><dd>Crea una tarea: {"titulo": texto obligatorio, "prioridad": 1–5}.</dd>
   <dt>PUT /tareas/{id}</dt><dd>Reemplaza una de tus tareas.</dd>
   <dt>DELETE /tareas/{id}</dt><dd>Borra una de tus tareas.</dd>
  </dl><p class="muted" style="font-size:14px;margin:12px 0 0">Todas las rutas requieren token. Nadie puede leer, modificar ni borrar tareas ajenas.</p></div>
 </div><aside class="side" id="side">${sideHTML("api")}</aside></div>`;
AFTER.api=()=>{
 if(!api.res){const r=handleApi("GET","/tareas","ana","");api.res=resHTML("GET","/tareas",r);}
 $("#api-res").innerHTML=api.res;
 if(api.form){$("#api-method").value=api.form.m;$("#api-path").value=api.form.p;$("#api-token").value=api.form.t;$("#api-body").value=api.form.b;}
 ["#api-method","#api-path","#api-token","#api-body"].forEach(s=>$(s).addEventListener("input",keepApiForm));
};
function keepApiForm(){api.form={m:$("#api-method").value,p:$("#api-path").value,t:$("#api-token").value,b:$("#api-body").value};}
function fillApi(m,p,t,b){$("#api-method").value=m;$("#api-path").value=p;$("#api-token").value=t;$("#api-body").value=b;keepApiForm();}
function sendApi(){keepApiForm();const {m,p,t,b}=api.form;const r=handleApi(m,p,t,b);api.res=resHTML(m,p,r);$("#api-res").innerHTML=api.res;
 api.history.unshift({m,p,t,b,s:r.s});api.history=api.history.slice(0,8);const h=$("#api-hist");if(h)h.innerHTML=historyHTML();}

/* ----- Nivel: detective de specs ----- */
let specMarks=new Set(),specChecked=false;
function specResult(){let hits=0,fp=0;SPEC.forEach((s,i)=>{if(specMarks.has(i)){if(s.f)hits++;else fp++;}});return {hits,fp,net:Math.max(0,hits-fp)};}
VIEWS.detective=()=>{
 const res=specChecked?specResult():null;
 return `${head("detective",`Antes de probar código se prueban las ideas. Toca cada frase que no se podría verificar tal como está escrita. Hay ${SPEC_FLAGS} escondidas entre ${SPEC.length}.`)}
 <div class="mission"><div style="display:grid;gap:18px;min-width:0">
  <article class="spec px"><h3>Exportar tareas a CSV</h3><p class="meta">Especificación v0.3 · equipo TaskPal</p>
   <p class="body">${SPEC.map((s,i)=>{let c="seg";if(specChecked){c+=s.f?(specMarks.has(i)?" hit":" miss"):(specMarks.has(i)?" fp":"");}else if(specMarks.has(i))c+=" marked";
     return `<span class="${c}" role="button" tabindex="0" aria-pressed="${specMarks.has(i)}" ${specChecked?'aria-disabled="true"':""} data-seg="${i}">${esc(s.t)}</span>${specChecked&&s.f?`<sup>${SPEC.slice(0,i+1).filter(x=>x.f).length}</sup>`:""}`;}).join(" ")}</p></article>
  <div class="row">${specChecked?`<button class="btn" data-spec-retry>Intentar de nuevo</button>`:`<button class="btn" data-spec-check>Revisar (${specMarks.size} marcadas)</button>`}${!specChecked&&specMarks.size?`<button class="btn ghost" data-spec-clear>Borrar marcas</button>`:""}</div>
  ${res?`<div class="px side-box"><p class="lbl">Resultado</p><p class="big">${res.net}/${SPEC_FLAGS}</p><p style="margin:0 0 12px">Aciertos: ${res.hits}. Falsos positivos: ${res.fp}. Puntaje = aciertos − falsos positivos. ${res.hits===SPEC_FLAGS&&res.fp===0?"Lectura perfecta.":"Las frases en rojo se te escaparon; las tachadas sí se pueden probar."}</p>
   <div class="legend" style="margin-bottom:12px"><span style="background:#bff0cf">encontrada</span><span style="background:#ffd1d1">se te escapó</span><span style="background:#e3defa">falso positivo</span></div>
   <ol class="why-list">${SPEC.filter(s=>s.f).map(s=>`<li>${esc(s.f)}</li>`).join("")}</ol></div>`:""}
 </div><aside class="side"><div class="px side-box"><p class="lbl">Qué buscar</p><p style="margin:0 0 8px">Ambigüedad, palabras evasivas (debería, podría), vaguedad sin dueño, jerga y siglas, simplificación excesiva y complicación excesiva.</p><p class="muted" style="margin:0;font-size:14px">Cada falso positivo resta un punto, así que marcar todo no sirve. Mejor puntaje: ${S.spec.best}/${SPEC_FLAGS}. Cada punto nuevo vale 10 XP.</p></div></aside></div>`;
};
function toggleSeg(i){if(specChecked)return;specMarks.has(i)?specMarks.delete(i):specMarks.add(i);render();}
function checkSpec(){specChecked=true;const {hits,fp,net}=specResult();
 if(net>S.spec.best){S.xp+=(net-S.spec.best)*10;S.spec.best=net;}
 if(hits===SPEC_FLAGS&&fp===0)S.spec.perfect=true;
 if(net>=4)unlock("spec-watchlist");
 save();checkBadges();render();$("[data-spec-retry]")?.focus();}

/* ----- Nivel: forja ----- */
let fz=null;
function forgeStart(id){const m=MNEMO.find(x=>x.id===id);const bank=shuffle(m.w.concat(m.x).map(([w,g])=>({w,g})));fz={id,slots:m.w.map(()=>null),bank,checked:false,msg:""};}
VIEWS.forja=()=>{
 if(!fz)forgeStart((MNEMO.find(m=>!S.forge[m.id])||MNEMO[0]).id);
 const m=MNEMO.find(x=>x.id===fz.id);const used=new Set(fz.slots.filter(s=>s!==null));
 const card=CARDS[m.id];
 return `${head("forja","Las mnemotecnias comprimen una lista de chequeo en una palabra. Coloca cada término bajo su letra. Hay dos intrusos en cada banco.")}
 <div class="forge"><div class="m-list" role="group" aria-label="Mnemotecnias">${MNEMO.map(x=>`<button data-forge="${x.id}" aria-pressed="${x.id===fz.id}"><span>${x.acr}</span><span class="ck">${S.forge[x.id]?'✓<span class="sr-only"> forjada</span>':""}</span></button>`).join("")}</div>
  <div class="bench px">
   <div><p class="lbl">${card&&card.src?"De "+esc(card.src):"Clásico"}</p><h2 style="font-size:22px;color:var(--amber)">${m.acr}</h2></div>
   <div class="slots">${fz.slots.map((s,i)=>{const it=s!==null?fz.bank[s]:null;let c="slot";if(!it)c+=" empty";else if(fz.checked)c+=it.w===m.w[i][0]?" right":" wrong";
     return `<button class="${c}" data-slot="${i}" aria-label="Letra ${m.acr[i]}: ${it?esc(it.w):"vacía"}"><span class="letter">${m.acr[i]}</span><span class="w">${it?esc(it.w):"—"}</span></button>`;}).join("")}</div>
   <div><p class="lbl">Banco de palabras</p><div class="bank">${fz.bank.map((b,j)=>`<button data-bank="${j}" ${used.has(j)?"disabled":""}>${esc(b.w)}<small>${esc(b.g)}</small></button>`).join("")}</div></div>
   <div class="row"><button class="btn" data-forge-check>Comprobar</button><button class="btn ghost" data-forge-clear>Vaciar</button>${S.forge[m.id]&&MNEMO.some(x=>!S.forge[x.id])?`<button class="btn ghost" data-forge-next>Siguiente pendiente</button>`:""}</div>
   <p class="forge-msg" aria-live="polite">${esc(fz.msg)}</p>
  </div></div>`;
};
function forgeCheck(){const m=MNEMO.find(x=>x.id===fz.id);
 if(fz.slots.some(s=>s===null)){fz.msg="Faltan letras por llenar.";fz.checked=false;render();return;}
 fz.checked=true;const ok=fz.slots.every((s,i)=>fz.bank[s].w===m.w[i][0]);
 if(ok){if(!S.forge[m.id]){S.forge[m.id]=true;S.xp+=15;fz.msg=`¡${m.acr} forjada! +15 XP.`;}else fz.msg=`¡${m.acr} correcta otra vez!`;unlock(m.id);save();checkBadges();}
 else{const bad=fz.slots.filter((s,i)=>fz.bank[s].w!==m.w[i][0]).length;fz.msg=`${plural(bad,"pieza no va","piezas no van")} ahí. Cambia las marcadas en rojo.`;}
 render();}

/* ----- Códice ----- */
let cxFilter="Todas";
VIEWS.codice=()=>{const list=CARD_ORDER.filter(id=>cxFilter==="Todas"||CARDS[id].cat===cxFilter);const n=Object.keys(S.cards).length;
 const cnt=c=>{const ids=CARD_ORDER.filter(id=>c==="Todas"||CARDS[id].cat===c);return `${ids.filter(id=>S.cards[id]).length}/${ids.length}`;};
 return `<div class="m-head"><div><p class="lbl">Colección</p><h2>Códice de heurísticas · ${n}/${CARD_ORDER.length}</h2><p>Cada carta resume una heurística con un ejemplo y una combinación sugerida. Las cartas bloqueadas indican dónde conseguirlas.</p></div></div>
 <div class="filters" role="group" aria-label="Filtrar por categoría">${["Todas"].concat(CATS).map(c=>`<button class="chip" data-filter="${esc(c)}" aria-pressed="${c===cxFilter}" ${c===cxFilter?'style="border-color:var(--amber);color:var(--amber)"':""}>${esc(c)} · ${cnt(c)}</button>`).join("")}</div>
 <div class="cards">${list.map(id=>{const c=CARDS[id];return S.cards[id]?`<article class="card px"><span class="cat">${esc(c.cat)}</span><h3>${esc(c.n)}</h3><p>${esc(c.d)}</p><dl><dt>Ejemplo</dt><dd>${esc(c.ej)}</dd><dt>Combínala con</dt><dd>${esc(c.combo)}</dd></dl>${c.src?`<p class="src">Autoría: ${esc(c.src)}</p>`:""}</article>`
   :`<article class="card locked px"><span class="cat">${esc(c.cat)}</span><h3>???</h3><p class="muted">Se desbloquea en: ${esc(c.how)}</p></article>`;}).join("")}</div>`;};

/* ----- Logros ----- */
let confirmReset=false,ioMsg="";
function summaryText(){const rk=rank();
 return [`Cacería Heurística — ${Math.round(progress()*100)} % completado`,`Rango: ${rk.name} (${S.xp} XP)`,
  ...LEVELS.map((l,i)=>{const [a,b]=levelProg(l.id);return `Nivel ${i+1} · ${l.n}: ${a}/${b}`;}),
  `Cartas: ${Object.keys(S.cards).length}/${CARD_ORDER.length} · Insignias: ${Object.keys(S.badges).length}/${BADGES.length}`,
  `Clasificaciones al primer intento: ${S.firstTry}`].join("\n");}
VIEWS.logros=()=>`<div class="m-head"><div><p class="lbl">Tu partida</p><h2>Logros · ${Object.keys(S.badges).length}/${BADGES.length}</h2><p>XP total: ${S.xp}. Rango: ${esc(rank().name)}. Clasificaciones correctas al primer intento: ${S.firstTry} de ${nFound()}.</p></div></div>
 <div class="badges">${BADGES.map(b=>`<div class="badge px ${S.badges[b.id]?"":"off"}">${pix(STAR)}<div><b>${esc(b.n)}</b><span>${S.badges[b.id]?"":"Bloqueada · "}${esc(b.d)}</span></div></div>`).join("")}</div>
 <div class="px side-box io"><p class="lbl">Guardar y compartir</p>
  <p>Tu progreso vive solo en este navegador. Descárgalo para continuar en otra computadora, o copia un resumen para compartirlo.</p>
  <div class="row"><button class="btn" data-export>Descargar partida</button><button class="btn ghost" data-import>Cargar partida</button><button class="btn ghost" data-copy-summary>Copiar resumen</button></div>
  <input type="file" id="import-file" accept="application/json,.json" hidden>
  <p class="io-msg" aria-live="polite">${esc(ioMsg)}</p></div>
 <div class="px side-box"><p class="lbl">Reiniciar</p><p style="margin:0 0 12px">Borra tu XP, cartas e insignias de este navegador.</p>
 ${confirmReset?`<div class="row"><button class="btn danger" data-reset-yes>Sí, borrar todo</button><button class="btn ghost" data-reset-no>Cancelar</button></div>`:`<button class="btn ghost" data-reset>Reiniciar progreso</button>`}</div>`;
AFTER.logros=()=>{
 $("#import-file").addEventListener("change",ev=>{const f=ev.target.files&&ev.target.files[0];if(!f)return;
  if(f.size>200000){ioMsg="El archivo es demasiado grande para ser una partida.";render();return;}
  f.text().then(txt=>{let o;try{o=JSON.parse(txt);}catch(e){ioMsg="No se pudo leer el archivo: no es JSON válido.";render();return;}
   if(!isObj(o)||o.juego!=="caceria-heuristica"||!isObj(o.partida)){ioMsg="Ese archivo no es una partida de Cacería Heurística.";render();return;}
   S=normalize(o.partida);save();checkBadges();fz=null;ioMsg=`Partida cargada: ${S.xp} XP, ${nFound()} bugs.`;render();});});
};
function exportGame(){
 const data=JSON.stringify({juego:"caceria-heuristica",version:VERSION,exportado:new Date().toISOString(),partida:S},null,2);
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));
 a.download=`caceria-heuristica-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();
 setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);ioMsg="Partida descargada.";render();}
function copySummary(){const t=summaryText();
 const done=()=>{ioMsg="Resumen copiado al portapapeles.";render();};
 const fallback=()=>{const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
  let ok=false;try{ok=document.execCommand("copy");}catch(e){}ta.remove();if(ok)done();else{ioMsg="No se pudo copiar automáticamente.";render();}};
 if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(done,fallback);else fallback();}

/* ---------- reinicio de misiones ---------- */
function resetMission(m){
 if(m==="registro"){reg.accounts=seedAccounts();reg.last=0;reg.lastEmail="";}
 if(m==="recordatorios")rec.list=seedReminders();
 if(m==="lista"){Object.assign(lst,seedList(),{sel:new Set(),q:"",editing:null,orig:""});}
 if(m==="api"){api.tasks=seedTasks();api.next=10;api.res=null;api.history=[];api.form=null;}
}

/* ---------- modal ---------- */
const queue=[];let modalOpen=false,modalKind=null,returnFocus=null;
function triggerBug(id,detail){if(S.found[id]||queue.some(q=>q.id===id))return;queue.push({id,detail});if(!modalOpen)openModal();}
function showModal(html,kind){const md=$("#modal");if(!modalOpen)returnFocus=document.activeElement;md.innerHTML=html;md.hidden=false;modalOpen=true;modalKind=kind;
 document.body.style.overflow="hidden";const f=md.querySelector(".opt,[data-continue],[data-close-review]");f&&f.focus();}
function hideModal(){$("#modal").hidden=true;$("#modal").innerHTML="";modalOpen=false;modalKind=null;document.body.style.overflow="";
 if(returnFocus&&document.contains(returnFocus))returnFocus.focus({preventScroll:true});else $("#view").focus({preventScroll:true});returnFocus=null;}
function openModal(){const q=queue[0];const b=BUGS[q.id];const opts=shuffle(b.opts.slice());
 showModal(`<div class="dialog px" role="dialog" aria-modal="true" aria-labelledby="mt" aria-describedby="md">
  <div class="dlg-head">${pix(BUG)}<div><p class="lbl">Comportamiento anómalo</p><h2 id="mt">${esc(b.t)}</h2></div></div>
  <p id="md">${esc(b.obs)}</p>${q.detail?`<pre class="term">${esc(q.detail)}</pre>`:""}
  <p class="q">¿Qué heurística te llevó a encontrarlo?</p>
  <div class="opts">${opts.map(o=>`<button class="opt" data-opt="${esc(o)}">${esc(o)}</button>`).join("")}</div>
  <div class="verdict" id="verdict" aria-live="polite"></div></div>`,"classify");}
function answer(label){const q=queue[0];if(!q||S.found[q.id])return;const b=BUGS[q.id];const ok=b.ok.includes(label);
 $$(".opt").forEach(o=>{o.disabled=true;const l=o.dataset.opt;if(b.ok.includes(l))o.classList.add("right");else if(l===label)o.classList.add("wrong");});
 const primary=LABEL[b.ok[0]];const card=ok?LABEL[label]:primary;
 S.found[q.id]={ok,card,pick:label,detail:q.detail||null};S.xp+=ok?30:10;if(ok)S.firstTry++;
 unlock(card);unlock(primary);save();
 $("#verdict").innerHTML=`<p class="ttl ${ok?"good":"meh"}">${ok?"¡Correcto! +30 XP":"No exactamente. +10 XP por encontrarlo"}</p><p>${esc(b.why)}</p>${b.ok.length>1?`<p class="muted">Respuestas válidas: ${b.ok.map(esc).join(" · ")}</p>`:""}<p class="muted">Carta: ${esc(CARDS[card].n)}</p><div><button class="btn" data-continue>Continuar</button></div>`;
 $("#verdict button").focus();}
function closeModal(){queue.shift();hideModal();checkBadges();refreshSide();if(queue.length)openModal();}
function openReview(id){const b=BUGS[id],f=S.found[id];if(!b||!f||modalOpen)return;
 showModal(`<div class="dialog px" role="dialog" aria-modal="true" aria-labelledby="mt">
  <div class="dlg-head">${pix(BUG)}<div><p class="lbl">Repaso de hallazgo</p><h2 id="mt">${esc(b.t)}</h2></div></div>
  <p>${esc(b.obs)}</p>${f.detail?`<pre class="term">${esc(f.detail)}</pre>`:""}
  <div class="review-meta">${f.pick?`<p><b>Tu respuesta:</b> ${esc(f.pick)} ${f.ok?"(correcta)":"(incorrecta)"}</p>`:""}<p><b>${b.ok.length>1?"Respuestas válidas":"Respuesta"}:</b> ${b.ok.map(esc).join(" · ")}</p></div>
  <p>${esc(b.why)}</p><div><button class="btn" data-close-review>Cerrar</button></div></div>`,"review");}

/* ---------- eventos ---------- */
document.addEventListener("click",e=>{
 const el=e.target.closest("button,[data-seg]");if(!el)return;const d=el.dataset;
 if(modalOpen&&!el.closest("#modal"))return;
 if(d.go!==undefined)return go(d.go);
 if(d.opt!==undefined)return answer(d.opt);
 if(d.continue!==undefined)return closeModal();
 if(d.closeReview!==undefined)return hideModal();
 if(d.review!==undefined)return openReview(d.review);
 if(d.hint!==undefined){S.hints[d.hint]=Math.min(HINTS[d.hint].length,S.hints[d.hint]+1);save();return refreshSide();}
 if(d.wisdom!==undefined){wisdomI=(wisdomI+1)%WISDOM.length;return render();}
 if(d.reopen!==undefined){$("#reg-crash").hidden=true;$("#reg-nombre").focus();return;}
 if(d.preset!==undefined){const pr=PRESETS[+d.preset];return fillApi(pr[1],pr[2],pr[3],pr[4]);}
 if(d.hist!==undefined){const h=api.history[+d.hist];if(h)fillApi(h.m,h.p,h.t,h.b);return $("#api-path").focus();}
 if(d.send!==undefined)return sendApi();
 if(d.resetApi!==undefined){resetMission("api");api.res=`<span class="s2">Datos restaurados: tareas 1 a 9.</span>`;return render();}
 if(d.resetMission!==undefined){resetMission(d.resetMission);toast("Datos de la misión restaurados");return render();}
 if(lstClick(d))return;
 if(d.seg!==undefined)return toggleSeg(+d.seg);
 if(d.specCheck!==undefined)return checkSpec();
 if(d.specRetry!==undefined){specChecked=false;specMarks=new Set();render();return $("[data-seg]")?.focus();}
 if(d.specClear!==undefined){specMarks=new Set();return render();}
 if(d.forge!==undefined){forgeStart(d.forge);return render();}
 if(d.forgeNext!==undefined){const nx=MNEMO.find(x=>!S.forge[x.id]);if(nx){forgeStart(nx.id);render();$(`[data-forge="${nx.id}"]`)?.focus();}return;}
 if(d.bank!==undefined){const i=fz.slots.indexOf(null);if(i>=0){fz.slots[i]=+d.bank;fz.checked=false;fz.msg="";render();}return;}
 if(d.slot!==undefined){const i=+d.slot;if(fz.slots[i]!==null){fz.slots[i]=null;fz.checked=false;fz.msg="";render();}return;}
 if(d.forgeCheck!==undefined)return forgeCheck();
 if(d.forgeClear!==undefined){fz.slots=fz.slots.map(()=>null);fz.checked=false;fz.msg="";return render();}
 if(d.filter!==undefined){cxFilter=d.filter;return render();}
 if(d.export!==undefined)return exportGame();
 if(d.import!==undefined)return $("#import-file").click();
 if(d.copySummary!==undefined)return copySummary();
 if(d.reset!==undefined){confirmReset=true;render();return $("[data-reset-no]")?.focus();}
 if(d.resetNo!==undefined){confirmReset=false;return render();}
 if(d.resetYes!==undefined){S=blank();save();confirmReset=false;ioMsg="";fz=null;specMarks=new Set();specChecked=false;
  ["registro","recordatorios","lista","api"].forEach(resetMission);toast("Progreso reiniciado");return render();}
});
document.addEventListener("keydown",e=>{
 if(modalOpen){
  if(e.key==="Escape"&&modalKind==="review"){e.preventDefault();return hideModal();}
  if(e.key==="Tab"){const f=$$("#modal button:not(:disabled)");if(!f.length)return;const first=f[0],last=f[f.length-1];
   if(!$("#modal").contains(document.activeElement)){e.preventDefault();first.focus();}
   else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
  return;
 }
 const s=e.target.closest&&e.target.closest("[data-seg]");
 if(s&&(e.key==="Enter"||e.key===" ")){e.preventDefault();toggleSeg(+s.dataset.seg);}
 if(e.key==="Enter"&&e.target.id==="api-path"){e.preventDefault();sendApi();}
 if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&e.target.id==="api-body"){e.preventDefault();sendApi();}
 if(e.target.id==="lst-edit-in"){if(e.key==="Enter"){e.preventDefault();lstCloseEdit(lst.editing,true);}else if(e.key==="Escape"){e.preventDefault();lstCloseEdit(lst.editing,false);}}
});

/* Bloquear el submit de formularios mientras el modal está abierto evita disparar bugs detrás de él. */
document.addEventListener("submit",e=>{if(modalOpen){e.preventDefault();e.stopImmediatePropagation();}},true);

save();
render();
})();
