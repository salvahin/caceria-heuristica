// Pruebas de extremo a extremo: verifican que cada bug plantado se pueda disparar
// y que el juego (progreso, cartas, insignias, guardado) funcione.
// Ejecuta:  npm install && npx playwright install chromium && npm test
const { test, expect } = require("@playwright/test");
const path = require("path");

const URL = "file://" + path.resolve(__dirname, "..", "index.html");

/** Abre el juego con almacenamiento limpio y sin fuentes externas. */
async function abrir(page, hash = "") {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(URL + hash);
  return errores;
}
async function ir(page, ruta) {
  await page.locator(`.nav [data-go="${ruta}"]`).click();
  await expect(page).toHaveURL(new RegExp("#" + ruta + "$"));
  await expect(page.locator(`.nav [data-go="${ruta}"]`)).toHaveAttribute("aria-current", "page");
}

/** Mientras haya un modal de clasificación abierto, elige una respuesta correcta y continúa. Devuelve los títulos clasificados. */
async function clasificar(page, { equivocarse = false } = {}) {
  const titulos = [];
  const modal = page.locator("#modal");
  while (await modal.isVisible()) {
    const titulo = await modal.locator("h2").innerText();
    const ok = await page.evaluate((t) => Object.values(window.CH.BUGS).find((b) => b.t === t).ok, titulo);
    if (equivocarse) await modal.locator(".opt").filter({ hasNotText: new RegExp("^(" + ok.map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")$") }).first().click();
    else await modal.locator(".opt", { hasText: ok[0] }).first().click();
    await modal.locator("[data-continue]").click();
    titulos.push(titulo);
  }
  return titulos;
}
const encontrados = (page) => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("caceria-heuristica-v1")).found));

async function registrar(page, { nombre = "Carla Ruiz", correo, edad = "24", pass = "tareas2026" }) {
  await page.fill("#reg-nombre", nombre);
  await page.fill("#reg-correo", correo);
  await page.fill("#reg-edad", edad);
  await page.fill("#reg-pass", pass);
  await page.click("#reg-form .app-btn");
}

test("Nivel 1 · registro: los 9 bugs se pueden encontrar", async ({ page }) => {
  const errores = await abrir(page, "#registro");
  await registrar(page, { nombre: "   ", correo: "a1@correo.mx" }); await clasificar(page);
  await registrar(page, { nombre: "x".repeat(70), correo: "a2@correo.mx" }); await clasificar(page);
  await registrar(page, { nombre: "José Núñez", correo: "a3@correo.mx" }); await clasificar(page);
  await registrar(page, { nombre: "Ana 🚀", correo: "a4@correo.mx" }); await clasificar(page);
  await expect(page.locator("#reg-crash")).toBeVisible();
  await page.click("[data-reopen]");
  await registrar(page, { correo: "juanperez.com" }); await clasificar(page);
  await registrar(page, { correo: "a5@correo.mx", edad: "-5" }); await clasificar(page);
  await registrar(page, { correo: "a6@correo.mx", edad: "13" }); await clasificar(page);
  await page.waitForTimeout(1600);
  await registrar(page, { correo: "ana@correo.mx" }); await clasificar(page);
  await page.waitForTimeout(1600);
  await page.fill("#reg-correo", "doble@correo.mx");
  await page.locator("#reg-form .app-btn").dblclick(); await clasificar(page);
  const f = await encontrados(page);
  expect(f.filter((k) => k.startsWith("r-")).sort()).toEqual(["r-acentos","r-correo","r-edad-13","r-edad-neg","r-emoji","r-espacios","r-flood","r-largo","r-unico"]);
  await expect(page.locator("#side .big")).toHaveText("9/9");
  expect(errores).toEqual([]);
});

test("Nivel 2 · recordatorios: los 6 bugs se pueden encontrar", async ({ page }) => {
  const errores = await abrir(page, "#recordatorios");
  const prog = async (fecha, hora = "09:30", zona = "cdmx") => {
    await page.fill("#rec-fecha", fecha); await page.fill("#rec-hora", hora); await page.selectOption("#rec-zona", zona);
    await page.click("#rec-form .app-btn"); await clasificar(page);
  };
  await prog("2026-05-06");
  await prog("31/09/2026");
  await prog("29/02/2027");
  await prog("15/11/2026", "12:30 am");
  await prog("08/03/2026", "02:30", "ny");
  const f = await encontrados(page);
  expect(f.sort()).toEqual(["f-31sep","f-ampm","f-bisiesto","f-dst","f-iso","f-zona"]);
  expect(errores).toEqual([]);
});

test("Nivel 3 · lista de tareas: los 8 bugs se pueden encontrar", async ({ page }) => {
  const errores = await abrir(page, "#lista");
  const agregar = async (t) => { await page.fill("#lst-new", t); await page.click("#lst-form .app-btn"); };
  // Orden con acentos y minúsculas
  await agregar("árbol de Navidad"); await page.click("[data-lst-sort]"); await clasificar(page);
  // Ninguna seleccionada
  await page.click("[data-lst-bulk]"); await clasificar(page);
  // Borrar la última
  await page.locator("[data-lst-del]").last().click(); await clasificar(page);
  // Cancelar que guarda
  await page.locator("[data-lst-edit]").first().click();
  await page.fill("#lst-edit-in", "Título cambiado"); await page.click("[data-lst-cancel]"); await clasificar(page);
  // Duplicar y editar la copia
  await page.locator("[data-lst-dup]").first().click();
  await page.locator("[data-lst-edit]").nth(1).click();
  await page.fill("#lst-edit-in", "Copia editada"); await page.click("[data-lst-save]"); await clasificar(page);
  await expect(page.locator(".lst .t", { hasText: "Copia editada" })).toHaveCount(2);
  // Búsqueda desactualizada
  await page.locator("[data-lst-edit]").last().click();
  await page.fill("#lst-edit-in", "Zanahorias xyz"); await page.keyboard.press("Enter");
  await page.fill("#lst-q", "xyz"); await clasificar(page);
  await page.fill("#lst-q", "");
  // Muchos
  for (let i = 0; i < 8; i++) { await agregar("Tarea extra " + i); await clasificar(page); }
  await expect(page.locator(".lst-item")).toHaveCount(10);
  // Cero
  while (await page.locator("[data-lst-del]").count()) { await page.locator("[data-lst-del]").first().click(); await clasificar(page); }
  await expect(page.locator("#lst-sum")).toContainText("NaN");
  await clasificar(page);
  const f = await encontrados(page);
  expect(f.sort()).toEqual(["l-buscar","l-cancelar","l-cero","l-duplicar","l-final","l-muchos","l-ninguna","l-orden"]);
  expect(errores).toEqual([]);
});

test("Nivel 4 · API: los 7 bugs se pueden encontrar y hay historial", async ({ page }) => {
  const errores = await abrir(page, "#api");
  const enviar = async (m, p, t = "ana", b = "") => {
    await page.selectOption("#api-method", m); await page.fill("#api-path", p); await page.selectOption("#api-token", t); await page.fill("#api-body", b);
    await page.click("[data-send]"); await clasificar(page);
  };
  await enviar("DELETE", "/tareas/1", "none");
  await enviar("GET", "/tareas/7", "ana");
  await enviar("POST", "/tareas", "ana", '{"titulo": "   "}');
  await enviar("POST", "/tareas", "ana", '{"titulo": null}');
  await enviar("GET", "/tareas?limit=-1");
  await enviar("GET", "/tareas?limit=1000");
  await enviar("PATCH", "/tareas/2");
  const f = await encontrados(page);
  expect(f.sort()).toEqual(["a-del","a-idor","a-lim","a-neg","a-null","a-patch","a-vacio"]);
  await expect(page.locator(".history li")).toHaveCount(7);
  await page.locator("[data-hist='6']").click();
  await expect(page.locator("#api-method")).toHaveValue("DELETE");
  // Ctrl+Enter en el cuerpo envía
  await page.selectOption("#api-method", "GET"); await page.fill("#api-path", "/tareas/2"); await page.selectOption("#api-token", "ana");
  await page.locator("#api-body").press("Control+Enter");
  await expect(page.locator(".history li")).toHaveCount(8);
  expect(errores).toEqual([]);
});

test("Nivel 5 · specs: marcar todo ya no da puntaje completo", async ({ page }) => {
  await abrir(page, "#detective");
  const n = await page.locator("[data-seg]").count();
  for (let i = 0; i < n; i++) await page.locator(`[data-seg="${i}"]`).click();
  await page.click("[data-spec-check]");
  await expect(page.locator(".side-box .big").first()).toHaveText("2/8");
  await page.click("[data-spec-retry]");
  const malas = await page.evaluate(() => window.CH.SPEC.map((s, i) => (s.f ? i : -1)).filter((i) => i >= 0));
  for (const i of malas) await page.locator(`[data-seg="${i}"]`).click();
  await page.click("[data-spec-check]");
  await expect(page.locator(".side-box .big").first()).toHaveText("8/8");
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("caceria-heuristica-v1")));
  expect(s.spec).toEqual({ best: 8, perfect: true });
  expect(s.badges.ojo).toBe(true);
});

test("Partida completa: 100 %, todas las cartas e insignias de colección", async ({ page }) => {
  const errores = await abrir(page);
  // Marca todos los bugs como encontrados eligiendo siempre la respuesta ALTERNATIVA cuando existe,
  // el caso que antes dejaba cartas imposibles de conseguir.
  await page.evaluate(() => {
    const { BUGS } = window.CH;
    const found = {};
    for (const [k, b] of Object.entries(BUGS)) found[k] = { ok: true, card: null, pick: b.ok[b.ok.length - 1] };
    localStorage.setItem("caceria-heuristica-v1", JSON.stringify({ xp: 0, found, cards: {}, spec: { best: 8, perfect: true } }));
  });
  await page.reload();
  // Forja de las 9 mnemotecnias con la interfaz
  await ir(page, "forja");
  const mnemo = await page.evaluate(() => window.CH.MNEMO.map((m) => ({ id: m.id, w: m.w.map((x) => x[0]) })));
  for (const m of mnemo) {
    await page.click(`[data-forge="${m.id}"]`);
    for (const w of m.w) await page.locator(".bank button:not(:disabled)", { hasText: new RegExp("^" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().click();
    await page.click("[data-forge-check]");
    await expect(page.locator(".forge-msg")).toContainText("forjada");
  }
  await ir(page, "codice");
  await expect(page.locator("#view h2")).toContainText("29/29");
  await expect(page.locator(".card.locked")).toHaveCount(0);
  await ir(page, "inicio");
  await expect(page.locator(".final-top b")).toHaveText("100 %");
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("caceria-heuristica-v1")));
  expect(s.badges.coleccionista && s.badges.leyenda && s.badges.memoria).toBe(true);
  expect(errores).toEqual([]);
});

test("Migración v1: recupera cartas que antes quedaban bloqueadas", async ({ page }) => {
  await abrir(page);
  await page.evaluate(() => localStorage.setItem("caceria-heuristica-v1", JSON.stringify({
    xp: 60, found: { "r-flood": { ok: true, card: "unicidad" }, "f-31sep": { ok: true, card: "limites" } },
    cards: { unicidad: true, limites: true }, hints: { registro: 1 }, spec: { best: 3, perfect: false }, badges: {}, firstTry: 2,
  })));
  await page.reload();
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("caceria-heuristica-v1")));
  expect(s.ver).toBe(2);
  expect(s.cards.inundacion && s.cards["dias-invalidos"]).toBe(true);
  expect(s.hints).toMatchObject({ registro: 1, lista: 0 });
});

test("Bitácora: un hallazgo se puede repasar y el modal atrapa el foco", async ({ page }) => {
  await abrir(page, "#registro");
  await registrar(page, { correo: "sinarroba" + ".mx" });
  await clasificar(page, { equivocarse: true });
  await page.click("[data-review='r-correo']");
  const modal = page.locator("#modal");
  await expect(modal).toContainText("Tu respuesta");
  await expect(modal).toContainText("(incorrecta)");
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.getElementById("modal").contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(page.locator("[data-review='r-correo']")).toBeFocused();
});

test("Navegación: el botón Atrás del navegador funciona", async ({ page }) => {
  await abrir(page);
  await ir(page, "registro");
  await ir(page, "codice");
  await page.goBack();
  await expect(page.locator("h2").first()).toHaveText("Registro de cuenta");
  await expect(page).toHaveTitle("Registro de cuenta · Cacería Heurística");
  await page.goBack();
  await expect(page.locator("h1")).toBeVisible();
});

test("Exportar e importar partida", async ({ page }, info) => {
  await abrir(page, "#registro");
  await registrar(page, { nombre: "   ", correo: "e1@correo.mx" }); await clasificar(page);
  await ir(page, "logros");
  const [descarga] = await Promise.all([page.waitForEvent("download"), page.click("[data-export]")]);
  const archivo = info.outputPath("partida.json");
  await descarga.saveAs(archivo);
  await page.click("[data-reset]"); await page.click("[data-reset-yes]");
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("caceria-heuristica-v1")).found).length)).toBe(0);
  await page.setInputFiles("#import-file", archivo);
  await expect(page.locator(".io-msg")).toContainText("Partida cargada");
  expect(await encontrados(page)).toEqual(["r-espacios"]);
  // Un archivo ajeno se rechaza
  await page.setInputFiles("#import-file", { name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"hola":1}') });
  await expect(page.locator(".io-msg")).toContainText("no es una partida");
});

test("Móvil: ninguna vista se desborda horizontalmente", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await abrir(page);
  for (const r of ["inicio", "registro", "recordatorios", "lista", "api", "detective", "forja", "codice", "logros"]) {
    await page.evaluate((r) => (location.hash = r), r);
    await page.waitForTimeout(50);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho, r).toBeLessThanOrEqual(360);
  }
});
