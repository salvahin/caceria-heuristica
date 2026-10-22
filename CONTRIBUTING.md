# Cómo contribuir

¡Gracias por querer mejorar Cacería Heurística! Hay tres formas de ayudar, de la más sencilla a la más completa.

## 1. Reportar un error del juego

Primero, una aclaración importante: **los 42 bugs de TaskPal están plantados a propósito**. Si el registro acepta un correo sin @ o la API borra tareas sin token, el juego funciona como debe.

Lo que sí nos interesa:

- Algo del juego se rompe: un botón no responde, la página se congela o hay errores en la consola.
- Un bug plantado no se dispara con la entrada que debería, o se dispara con una entrada válida.
- Una respuesta marcada como correcta parece incorrecta, o una opción incorrecta también sería válida.
- Una gravedad o una explicación te parece equivocada (aunque las gravedades son criterios discutibles, nos sirve la discusión).
- Errores de ortografía, textos confusos o problemas de accesibilidad del propio juego.

[Abre un issue de error](https://github.com/salvahin/caceria-heuristica/issues/new?template=error.yml) con el nivel, los pasos para reproducirlo, lo que esperabas y lo que pasó. Una captura ayuda mucho.

## 2. Sugerir una mejora

Ideas para un nivel nuevo, una heurística que falta, otra persona usuaria, mejoras pedagógicas o experiencias usándolo en clase: [abre un issue de sugerencia](https://github.com/salvahin/caceria-heuristica/issues/new?template=sugerencia.yml).

## 3. Proponer el cambio con un pull request

1. Haz un fork del repositorio y crea una rama para tu cambio.
2. Edita `index.html`: todo el juego vive en ese archivo.
3. Prueba localmente (ver abajo).
4. Abre un pull request explicando qué cambiaste y por qué. Si resuelve un issue, menciónalo.

Para cambios grandes, como un nivel nuevo, abre primero un issue para platicarlo.

### Convenciones del proyecto

- **Un solo archivo autocontenido:** sin frameworks, sin paso de compilación y sin dependencias externas salvo las fuentes de Google.
- **Español neutro de México** en toda la interfaz. Los nombres de las mnemotecnias se conservan en inglés con su glosa en español.
- **No copies el cheat sheet:** parafrasea cada descripción y da crédito a la autoría de cada mnemotecnia en el campo `src` de su carta.
- **Primero explorar, después nombrar:** no muestres la heurística antes de que la persona provoque el bug.
- **Bugs deterministas:** cada bug se dispara solo por la entrada de la persona, nunca al azar. Documenta cómo provocarlo con un comentario `// Provocar: …` junto a su `triggerBug`.
- **Cada bug nuevo necesita:** cuatro opciones del mismo tema (las correctas incluidas), una gravedad (`critica`, `alta`, `media` o `baja`) con su justificación (`sevWhy`) y pistas en su misión.
- **Sin backend ni calificación:** el progreso se guarda solo en el navegador.
- **Accesibilidad:** todo debe funcionar con teclado y a 400 px de ancho sin desplazamiento horizontal.

### Cómo probar tus cambios

1. Sirve la carpeta con un servidor estático, por ejemplo `python3 -m http.server 8000`, y abre http://localhost:8000.
2. Cambia temporalmente `const DEV=false;` a `true` al inicio del script y recarga. La consola debe decir «Datos válidos». Si reporta problemas, corrígelos. Vuelve a dejar `DEV=false` antes del pull request.
3. Revisa la sintaxis del script con Node:

   ```bash
   awk '/^<script>$/{f=1;next}/^<\/script>$/{f=0}f' index.html > /tmp/juego.js && node --check /tmp/juego.js
   ```

4. Juega el nivel que tocaste: provoca cada bug, comprueba que las entradas válidas no disparen nada y que no haya errores en la consola.
5. Revisa que un progreso guardado de una versión anterior siga cargando sin perder XP, cartas ni insignias.

## Licencia de las contribuciones

Al contribuir aceptas que tu código se publique bajo la licencia [MIT](LICENSE) y tu contenido educativo bajo [CC BY 4.0](LICENSE-CONTENT.md), igual que el resto del proyecto.

---

**English:** Contributions are welcome, and issues in English are fine. Remember that the 42 bugs in TaskPal are intentional; please report problems with the game itself, or share ideas, through [issues](https://github.com/salvahin/caceria-heuristica/issues/new/choose). For pull requests: keep the game in the single self-contained `index.html`, write UI text in Spanish, paraphrase rather than copy the cheat sheet, keep bugs deterministic and documented with `// Provocar:` comments, give each new bug same-topic options plus a severity, and validate with `DEV=true` and `node --check` before opening the PR. Contributions are licensed under MIT (code) and CC BY 4.0 (content).
