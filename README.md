# QUE NO ME FUMEN

Juego pixel art: eres un porro que huye de una mano gigante que se lo quiere fumar.

## Cómo jugar

Abre `index.html` en el navegador (doble clic) y listo. No hay que instalar nada.

| Acción | Teclado |
|---|---|
| Moverse | ← → (o A / D) |
| Saltar (doble salto) | ↑, W o ESPACIO |
| Agacharse | ↓ o S |
| Echar humo | E, X o SHIFT |
| Pausa | P o ESC |
| Silenciar | M |

### Qué hay en el juego

- **La mano** avanza desde la izquierda y, a partir de cierto punto, también ataca **desde arriba** (sombra con `!`). Si te agarra, te fuma.
- **Defensa:**
  - **HUMO:** se carga solo y con hojas; échaselo a la mano para aturdirla y empujarla.
  - **Pisotón:** cáele encima a encendedores, ceniceros, vasos y sopletes para romperlos.
- **Zonas** cada 500 m: La Calle, La Fiesta, El Parque, La Azotea y El Infierno. Cada una trae obstáculos nuevos (vasos, chispas, cerillos que caen, sopletes) y la mano se pone más agresiva. Después vuelven a empezar, más difíciles.
- **Power-ups:** escudo, imán, turbo y hojas x2. **Gotas** de agua alejan la mano.
- **Combo:** juntar hojas sin chocar multiplica los puntos.
- **Hojas = dinero.** Se guardan entre partidas y se gastan en la **tienda**:
  - **Mejoras permanentes:** pulmones, papel grueso (escudos), imán, patitas, gotas, power-ups largos, suerte y triple salto.
  - **Papeles (skins):** clásico, natural, rasta, tricolor, blunt, camuflaje, arcoíris, galaxia, neón, oro y diamante.
  - **Accesorios:** lentes, gorra, bandana, audífonos, sombrero y corona.
- **Misiones:** siempre hay 3 activas y dan hojas. Cada 3 misiones subes de **rango** (de Bachita a Leyenda), y cada rango da +10 % de puntos.
- **Bono diario** con racha, y **revivir** una vez por partida pagando hojas.
- El progreso se guarda en el navegador.

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

- `index.html`: la página, menús y controles táctiles.
- `style.css`: estilos.
- `js/data.js`: zonas, skins, accesorios, mejoras y misiones (aquí se ajustan precios y dificultad).
- `js/save.js`: guardado, misiones, rangos y bono diario.
- `js/audio.js`: sonidos sintetizados.
- `js/sprites.js`: el porro (generado por código para las skins), obstáculos, fondos y la mano.
- `js/ui.js`: menú, tienda, misiones, HUD y controles táctiles.
- `js/game.js`: la lógica del juego.

Está hecho en HTML5 Canvas + JavaScript puro, sin motor. Si después quieres pasarlo
a Unity o Godot, el diseño y los sprites sirven de base.
