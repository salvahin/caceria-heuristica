# Cacería Heurística 2.0

Juego web para aprender heurísticas de prueba de software. TaskPal es una app de tareas ficticia con bugs plantados a propósito: exploras, encuentras el bug, nombras la heurística que te llevó a él y desbloqueas cartas del Códice.

Fork del juego original de Salvador Hinojosa. El contenido está adaptado del [Test Heuristics Cheat Sheet](https://www.ministryoftesting.com/insights/test-heuristics-cheat-sheet) de Ministry of Testing (ideas originales de Elisabeth Hendrickson, James Lyndsay y Dale Emery).

## Cómo jugar

Abre `index.html` en el navegador. No necesita servidor ni instalación. Si prefieres servirlo localmente:

```bash
npm start   # http://localhost:5173
```

## Niveles

| # | Nivel | Contenido |
|---|-------|-----------|
| 1 | Registro de cuenta | 9 bugs de cadenas, números y reglas de negocio |
| 2 | Recordatorios | 6 bugs de fechas, horas y zonas horarias |
| 3 | Lista de tareas (nuevo) | 8 bugs de colecciones, posiciones, selección, búsqueda y CRUD |
| 4 | Consola de la API | 7 bugs con BINMEN, VADER y POISED |
| 5 | Detective de specs | 8 frases no verificables en una especificación |
| 6 | Forja de mnemotecnias | 9 acrónimos para armar letra por letra |

## Cambios respecto al original

**Contenido nuevo**
- Nivel 3, *Lista de tareas*, con 8 bugs nuevos y 5 cartas de la categoría Exploración: Cero, uno, muchos; Inicio, medio y final; Algunos, ninguno, todos; Sigue los datos; Interrupciones.
- Insignias nuevas: *Organizador del caos* y *Coleccionista*.

**Correcciones**
- Algunas cartas (por ejemplo *Inundación* y *Días siempre inválidos*) quedaban bloqueadas para siempre si se elegía la respuesta alternativa válida. Ahora la carta principal de cada bug se desbloquea siempre, y las partidas guardadas se migran automáticamente.
- En el detective de specs bastaba con marcar todas las frases para obtener el puntaje máximo. Ahora el puntaje es aciertos menos falsos positivos.
- La vista de la API se desbordaba horizontalmente en celulares.
- El botón Atrás del navegador no cambiaba de sección.
- El HTML tenía `<title>` y metadatos dentro de `<body>`, sin `lang`; ahora es un documento válido con favicon y descripción.

**Funciones nuevas**
- Descargar y cargar la partida (archivo JSON) para continuar en otra computadora, y copiar un resumen del progreso.
- Repasar cualquier bug encontrado desde la bitácora: evidencia, tu respuesta y la explicación.
- Historial de solicitudes en la consola de la API y envío con Ctrl + Enter.
- Botón para restaurar los datos de cada misión.
- Accesibilidad: foco atrapado y restaurado en los modales, Escape para cerrar repasos, foco conservado al re-renderizar, enlace para saltar al contenido y etiquetas en barras de progreso.

## Estructura

```
index.html          página
assets/styles.css   estilos
assets/data.js      contenido: cartas, bugs, pistas, niveles, spec y mnemotecnias
assets/app.js       lógica del juego
tests/              pruebas de extremo a extremo (Playwright)
```

Para agregar un bug: añádelo en `BUGS` (`assets/data.js`) con su misión, opciones, respuestas válidas y explicación, y dispáralo desde la misión con `triggerBug("id", "evidencia")` en `assets/app.js`. La primera respuesta de `ok` es la heurística principal.

## Pruebas

```bash
npm install
npx playwright install chromium
npm test
```

Las pruebas disparan los 30 bugs, completan una partida al 100 %, y verifican la migración de partidas, exportar e importar, navegación, foco en modales y que ninguna vista se desborde en móvil.
