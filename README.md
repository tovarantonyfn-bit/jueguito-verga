# QUE NO ME FUMEN

Juego pixel art: eres un porro que huye de una mano gigante que se lo quiere fumar.

## Cómo jugar

Abre `index.html` en el navegador (doble clic) y listo. No hay que instalar nada.

### En el celular

Salen botones en pantalla automáticamente:

- **◀ ▶** moverte · **▲** saltar (doble salto) · **▼** agacharte
- Puedes deslizar el dedo de un botón a otro sin soltarlo (por ejemplo de ▶ a ▲).
- **PAUSA**, **SON** (sonido) y **PANTALLA** (pantalla completa, solo Android).
- Se juega en vertical, pero acostado se ve más grande.

Para jugarlo en el cel necesita estar en internet, por ejemplo con GitHub Pages:
en el repo ve a **Settings → Pages**, en *Branch* elige la rama y la carpeta `/ (root)`,
dale *Save* y en un par de minutos te da un link tipo
`https://<tu-usuario>.github.io/jueguito-verga/` que abres en el navegador del cel.

| Acción | Teclado |
|---|---|
| Moverse | ← → (o A / D) |
| Saltar (doble salto) | ↑, W o ESPACIO |
| Agacharse | ↓ o S |
| Pausa | P o ESC |
| Silenciar | M |

- La **mano** avanza poco a poco desde la izquierda. Si te alcanza, te fuma.
- **Hojitas** 🌿: puntos y empujan la mano un poquito hacia atrás.
- **Gotas** 💧: empujan la mano muy atrás.
- **Encendedores, ceniceros y chispas**: si te pegan, te frenan y la mano se acerca.
- Más adelante la mano también ataca **desde arriba**: cuando veas una sombra con un `!` en el suelo, quítate.
- Cada vez es más rápido. Tu récord se guarda en el navegador.

## Archivos

- `index.html`: la página y las pantallas (título, game over).
- `style.css`: estilos y escalado pixelado.
- `game.js`: todo el juego: sprites (dibujados en texto), física, la mano, sonidos sintetizados.

Está hecho en HTML5 Canvas + JavaScript puro, sin motor. Si después quieres pasarlo
a Unity o Godot, el diseño y los sprites sirven de base.
