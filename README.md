# Cacería Heurística

Juego web en español, con estética retro, para aprender **heurísticas de prueba de software**: atajos mentales que ayudan a decidir qué probar.

**Juega aquí:** https://salvahin.github.io/caceria-heuristica/

Exploras TaskPal, una app de tareas ficticia con 42 bugs plantados a propósito. Cuando provocas uno, eliges qué heurística te llevó ahí y qué tan grave es, y desbloqueas una carta del Códice que la explica. Está basado en el [Test Heuristics Cheat Sheet](https://www.ministryoftesting.com/insights/test-heuristics-cheat-sheet) de Ministry of Testing.

*An English summary is at the end.*

## Para quién es

Estudiantes, testers junior y desarrolladores que empiezan. No asume conocimientos previos. Sirve para autoestudio o como actividad en clase.

## Niveles

| # | Nivel | Qué practica |
|---|---|---|
| 1 | Registro de cuenta | Ataques con cadenas, números y reglas de negocio en un formulario |
| 2 | Recordatorios | Formatos de fecha, años bisiestos, am/pm, zonas horarias y horario de verano |
| 3 | Consola de la API | BINMEN, VADER y POISED contra una API REST simulada |
| 4 | Detective de specs | Encontrar frases ambiguas o imposibles de probar en una especificación |
| 5 | Forja de mnemotecnias | Armar los acrónimos clásicos letra por letra |
| 6 | Dos sesiones | Concurrencia, inundación e interrupciones con dos teléfonos y una cuenta |
| 7 | Triaje del release | Priorizar riesgos con RCRCRC y armar un charter TORCH |
| 8 | Ruleta de personas | Siete enanos y perfiles de diversidad e inclusión |
| 9 | Accesibilidad | Teclado, lector de pantalla simulado, color, zoom, subtítulos y contraste |
| 10 | Día de release | Jefe final: 8 bugs mezclados contra el reloj y un reporte de bug |

## Intención pedagógica

- **Explorar antes de nombrar:** primero provocas el fallo y después aparece la heurística. Equivocarse da puntos y una explicación, nunca un castigo.
- **Distinguir heurísticas vecinas:** las opciones de cada bug son del mismo tema.
- **Juzgar qué importa:** cada bug pide estimar su gravedad, y los más graves valen más.
- **Pensar en otras personas:** personas usuarias distintas y accesibilidad.

## Limitaciones

- Enseña **heurísticas de prueba, no todo el testing**: no cubre planes formales, diseño de casos, automatización, pruebas de rendimiento reales ni gestión de defectos.
- Los bugs están plantados: el juego los detecta por ti y te dice cuántos hay. En la vida real, notar el fallo es la parte difícil.
- Las gravedades, los pesos del triaje y las interpretaciones de las personas son criterios del autor, para discutir.
- Es un **sitio estático**: sin servidor, cuentas ni calificaciones. El progreso se guarda solo en el navegador de cada persona.

La página **Acerca** dentro del juego amplía todo esto e incluye ideas para usarlo en clase.

## Cómo correrlo localmente

Todo el juego vive en un solo archivo, `index.html`, con HTML, CSS y JavaScript en línea, sin dependencias ni paso de compilación. Ábrelo directamente en el navegador o sírvelo con cualquier servidor estático, por ejemplo:

```bash
python3 -m http.server 8000
```

y visita http://localhost:8000.

Para validar los datos del juego, cambia `const DEV=false;` a `true` al inicio del script y revisa la consola: verifica que cada bug tenga opciones válidas, gravedad y que todas las cartas se puedan desbloquear.

## Cómo sugerir correcciones o mejoras

Las sugerencias son bienvenidas. Antes de reportar un bug, recuerda que **los 42 bugs de TaskPal son intencionales**: lo que buscamos son errores del juego mismo.

- **Encontraste un error real del juego** (algo se rompe, un texto está mal, una respuesta parece incorrecta): [abre un issue de error](https://github.com/salvahin/caceria-heuristica/issues/new?template=error.yml).
- **Tienes una idea** (un nivel nuevo, una heurística que falta, una mejora pedagógica): [abre un issue de sugerencia](https://github.com/salvahin/caceria-heuristica/issues/new?template=sugerencia.yml).
- **Quieres proponer el cambio tú mismo:** lee [CONTRIBUTING.md](CONTRIBUTING.md) y abre un pull request.

## Licencia

- **Código** (HTML, CSS y JavaScript): [MIT](LICENSE).
- **Contenido educativo original** (textos, explicaciones, bugs plantados, personas y escenarios): [CC BY 4.0](LICENSE-CONTENT.md).

Puedes usar, adaptar y compartir el juego, incluso con fines comerciales, siempre que des crédito. Las heurísticas y mnemotecnias pertenecen a sus autoras y autores originales: este proyecto las parafrasea y las acredita, y esas ideas no quedan cubiertas por estas licencias.

## Créditos

Creado por **Salvador Hinojosa** con Claude, el asistente de IA de Anthropic.

Contenido parafraseado y adaptado del Test Heuristics Cheat Sheet de Ministry of Testing (Simon Tomes, 2022). © 2006 Quality Tree Software, Inc. y © 2022 Ministry of Testing Ltd. Ideas originales de Elisabeth Hendrickson, James Lyndsay y Dale Emery, con aportes de Andrea Jensen, Ady Stokes, Callum Akehurst-Ryan, Dave Harrison, Deborah Sherwood, Mark Winteringham y Simon Tomes. Cada mnemotecnia conserva su nombre y el crédito a quienes la crearon.

---

## English summary

**Cacería Heurística** ("Heuristic Hunt") is a Spanish-language, retro-styled web game for learning **software testing heuristics**, based on Ministry of Testing's [Test Heuristics Cheat Sheet](https://www.ministryoftesting.com/insights/test-heuristics-cheat-sheet). Players explore TaskPal, a fictional to-do app with 42 deliberately planted bugs across 10 levels: input attacks, dates and time zones, a REST API, spec review, mnemonics, concurrency, release triage, personas, accessibility, and a timed boss level with a bug report. For each bug, players name the heuristic that led them there and rate its severity.

- **Play:** https://salvahin.github.io/caceria-heuristica/
- **Scope:** it teaches testing heuristics, not testing as a whole. Bugs are planted and detected by the game.
- **Static site:** no server or accounts. Progress is stored only in the player's browser.
- **Run locally:** open `index.html`. It's a single self-contained file.
- **Contribute:** the planted bugs are intentional. For real problems in the game, or ideas, [open an issue](https://github.com/salvahin/caceria-heuristica/issues/new/choose) or see [CONTRIBUTING.md](CONTRIBUTING.md). Issues in English are welcome.
- **License:** code under [MIT](LICENSE); original educational content under [CC BY 4.0](LICENSE-CONTENT.md). The heuristics themselves belong to their original authors.
- **Credits:** created by **Salvador Hinojosa** with Claude, Anthropic's AI assistant.
